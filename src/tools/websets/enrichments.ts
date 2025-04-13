import { z } from "zod";
import axios from "axios";
import { toolRegistry } from "../config.js";
import { createRequestLogger } from "../../utils/logger.js";
import { ExaWebsetsResponse } from "../../types.js";

// Extract the enrichment type from ExaWebsetsResponse
type WebsetEnrichmentResponse = ExaWebsetsResponse["enrichments"][0];

// Interface for the delete response
// The delete response returns the full enrichment object, same as get response
type DeleteEnrichmentResponse = WebsetEnrichmentResponse;

toolRegistry["create_enrichment"] = {
  name: "create_enrichment",
  description: "Create an Enrichment for a Webset using Exa's Websets API.",
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    webset: z.string().describe("The Webset ID"),
    description: z.string().min(1).max(5000).describe("Description of the enrichment task to perform on each Webset Item"),
    format: z.enum(["text", "date", "number", "options", "email", "phone"]).optional()
      .describe("Format of the enrichment response. If not provided, the best format is automatically selected based on the description"),
    options: z.array(
      z.object({
        label: z.string().describe("The label of the option")
      })
    ).optional().describe("When the format is options, the different options for the enrichment agent to choose from"),
    metadata: z.record(z.string().max(1000)).optional().describe("Metadata key-value pairs")
  },
  handler: async ({ apiKey, webset, description, format, options, metadata }) => {
    const requestId = `create_enrichment-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, 'create_enrichment');

    logger.start(`Creating Enrichment for Webset ${webset}`);

    try {
      const axiosInstance = axios.create({
        baseURL: "https://api.exa.ai",
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-api-key': apiKey
        },
        timeout: 30000
      });

      // Create typed payload
      const payload = {
        description,
        ...(format && { format }),
        ...(options && { options }),
        ...(metadata && { metadata })
      };

      logger.log("Sending POST request to Exa Websets API");

      const response = await axiosInstance.post<WebsetEnrichmentResponse>(
        `/websets/v0/websets/${encodeURIComponent(webset)}/enrichments`, 
        payload
      );

      logger.log("Received response from Exa Websets API");

      return {
        content: [{
          type: "text",
          text: JSON.stringify(response.data, null, 2)
        }]
      };
    } catch (error) {
      logger.error(error);

      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status || 'unknown';
        const errorMessage = error.response?.data?.message || error.message;

        logger.log(`Axios error (${statusCode}): ${errorMessage}`);
        return {
          content: [{
            type: "text",
            text: `Create Enrichment error (${statusCode}): ${errorMessage}`
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: "text",
          text: `Create Enrichment error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  },
  enabled: true
};

toolRegistry["get_enrichment"] = {
  name: "get_enrichment",
  description:
    "Retrieve an Enrichment by ID from a Webset using Exa's Websets API.",
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    webset: z.string().describe("The Webset ID"),
    id: z.string().describe("The Enrichment ID"),
  },
  handler: async ({ apiKey, webset, id }) => {
    const requestId = `get_enrichment-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 7)}`;
    const logger = createRequestLogger(requestId, "get_enrichment");

    logger.start(`Fetching Enrichment ${id} from Webset ${webset}`);

    try {
      const axiosInstance = axios.create({
        baseURL: "https://api.exa.ai",
        headers: {
          accept: "application/json",
          "x-api-key": apiKey,
        },
        timeout: 30000,
      });

      logger.log("Sending GET request to Exa Websets API");

      const response = await axiosInstance.get<WebsetEnrichmentResponse>(
        `/websets/v0/websets/${encodeURIComponent(
          webset
        )}/enrichments/${encodeURIComponent(id)}`
      );

      logger.log("Received response from Exa Websets API");

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error(error);

      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status || "unknown";
        const errorMessage = error.response?.data?.message || error.message;

        logger.log(`Axios error (${statusCode}): ${errorMessage}`);
        return {
          content: [
            {
              type: "text",
              text: `Get Enrichment error (${statusCode}): ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Get Enrichment error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  },
  enabled: true,
};

toolRegistry["delete_enrichment"] = {
  name: "delete_enrichment",
  description:
    "Delete an Enrichment by ID from a Webset using Exa's Websets API.",
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    webset: z.string().describe("The Webset ID"),
    id: z.string().describe("The Enrichment ID"),
  },
  handler: async ({ apiKey, webset, id }) => {
    const requestId = `delete_enrichment-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 7)}`;
    const logger = createRequestLogger(requestId, "delete_enrichment");

    logger.start(`Deleting Enrichment ${id} from Webset ${webset}`);

    try {
      const axiosInstance = axios.create({
        baseURL: "https://api.exa.ai",
        headers: {
          accept: "application/json",
          "x-api-key": apiKey,
        },
        timeout: 30000,
      });

      logger.log("Sending DELETE request to Exa Websets API");

      const response = await axiosInstance.delete<DeleteEnrichmentResponse>(
        `/websets/v0/websets/${encodeURIComponent(
          webset
        )}/enrichments/${encodeURIComponent(id)}`
      );

      logger.log("Received response from Exa Websets API");

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error(error);

      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status || "unknown";
        const errorMessage = error.response?.data?.message || error.message;

        logger.log(`Axios error (${statusCode}): ${errorMessage}`);
        return {
          content: [
            {
              type: "text",
              text: `Delete Enrichment error (${statusCode}): ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Delete Enrichment error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  },
  enabled: true,
};

toolRegistry["cancel_enrichment"] = {
  name: "cancel_enrichment",
  description: "Cancel a running Enrichment by ID using Exa's Websets API.",
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    webset: z.string().describe("The Webset ID"),
    id: z.string().describe("The Enrichment ID")
  },
  handler: async ({ apiKey, webset, id }) => {
    const requestId = `cancel_enrichment-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, 'cancel_enrichment');

    logger.start(`Canceling Enrichment ${id} in Webset ${webset}`);

    try {
      const axiosInstance = axios.create({
        baseURL: "https://api.exa.ai",
        headers: {
          'accept': 'application/json',
          'x-api-key': apiKey
        },
        timeout: 30000
      });

      logger.log("Sending POST request to Exa Websets API");

      const response = await axiosInstance.post<WebsetEnrichmentResponse>(
        `/websets/v0/websets/${encodeURIComponent(webset)}/enrichments/${encodeURIComponent(id)}/cancel`
      );

      logger.log("Received response from Exa Websets API");

      return {
        content: [{
          type: "text",
          text: JSON.stringify(response.data, null, 2)
        }]
      };
    } catch (error) {
      logger.error(error);

      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status || 'unknown';
        const errorMessage = error.response?.data?.message || error.message;

        logger.log(`Axios error (${statusCode}): ${errorMessage}`);
        return {
          content: [{
            type: "text",
            text: `Cancel Enrichment error (${statusCode}): ${errorMessage}`
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: "text",
          text: `Cancel Enrichment error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  },
  enabled: true
};
