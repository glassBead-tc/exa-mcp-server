import { z } from "zod";
import axios from "axios";
import { toolRegistry } from "../config.js";
import { createRequestLogger } from "../../utils/logger.js";
import { ExaWebsetsResponse } from "../../types.js";

// Extract the search type from ExaWebsetsResponse
type WebsetSearchResponse = ExaWebsetsResponse["searches"][0];

toolRegistry["create_search"] = {
  name: "create_search",
  description: "Create a Search for a Webset using Exa's Websets API.",
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    webset: z.string().describe("The Webset ID"),
    count: z.number().min(1).describe("Number of results to attempt to find"),
    query: z.string().min(1).max(5000).describe("Search query"),
    entity: z.object({
      type: z.enum(["company"]).optional().describe("Entity type. Currently only 'company' is supported")
    }).describe("Entity object"),
    criteria: z.array(
      z.object({
        description: z.string().describe("Description of the criterion")
      })
    ).optional().describe("Array of criteria objects"),
    behaviour: z.enum(["override"]).optional().describe("Search behaviour, defaults to 'override'"),
    metadata: z.record(z.string().max(1000)).optional().describe("Metadata key-value pairs")
  },
  handler: async ({ apiKey, webset, count, query, entity, criteria, behaviour, metadata }) => {
    const requestId = `create_search-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, 'create_search');

    logger.start(`Creating Search for Webset ${webset}`);

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
        count,
        query,
        entity,
        ...(criteria && { criteria }),
        ...(behaviour && { behaviour }),
        ...(metadata && { metadata })
      };

      logger.log("Sending POST request to Exa Websets API");

      const response = await axiosInstance.post<WebsetSearchResponse>(`/websets/v0/websets/${encodeURIComponent(webset)}/searches`, payload);

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
            text: `Create Search error (${statusCode}): ${errorMessage}`
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: "text",
          text: `Create Search error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  },
  enabled: true
};

toolRegistry["get_search"] = {
  name: "get_search",
  description: "Retrieve a Search by ID from a Webset using Exa's Websets API.",
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    webset: z.string().describe("The Webset ID"),
    id: z.string().describe("The Search ID")
  },
  handler: async ({ apiKey, webset, id }) => {
    const requestId = `get_search-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, 'get_search');

    logger.start(`Fetching Search ${id} from Webset ${webset}`);

    try {
      const axiosInstance = axios.create({
        baseURL: "https://api.exa.ai",
        headers: {
          'accept': 'application/json',
          'x-api-key': apiKey
        },
        timeout: 30000
      });

      logger.log("Sending GET request to Exa Websets API");

      const response = await axiosInstance.get<WebsetSearchResponse>(`/websets/v0/websets/${encodeURIComponent(webset)}/searches/${encodeURIComponent(id)}`);

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
            text: `Get Search error (${statusCode}): ${errorMessage}`
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: "text",
          text: `Get Search error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  },
  enabled: true
};

toolRegistry["cancel_search"] = {
  name: "cancel_search",
  description: "Cancel a running Search by ID using Exa's Websets API.",
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    webset: z.string().describe("The Webset ID"),
    id: z.string().describe("The Search ID")
  },
  handler: async ({ apiKey, webset, id }) => {
    const requestId = `cancel_search-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, 'cancel_search');

    logger.start(`Canceling Search ${id} in Webset ${webset}`);

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

      const response = await axiosInstance.post<WebsetSearchResponse>(`/websets/v0/websets/${encodeURIComponent(webset)}/searches/${encodeURIComponent(id)}/cancel`);

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
            text: `Cancel Search error (${statusCode}): ${errorMessage}`
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: "text",
          text: `Cancel Search error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  },
  enabled: true
};