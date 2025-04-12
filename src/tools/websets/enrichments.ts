import { z } from "zod";
import axios from "axios";
import { toolRegistry } from "../config.js";
import { createRequestLogger } from "../../utils/logger.js";

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

      const response = await axiosInstance.get(
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
  handler: async (args: { [key: string]: any }, extra: any) => {
    const { apiKey, webset, id } = args as {
      apiKey: string;
      webset: string;
      id: string;
    };
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

      const response = await axiosInstance.delete(
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
