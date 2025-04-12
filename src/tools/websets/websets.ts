import { z } from "zod";
import axios from "axios";
import { toolRegistry } from "../config.js";
import { createRequestLogger } from "../../utils/logger.js";

toolRegistry["create_webset"] = {
  name: "create_webset",
  description: "Create a Webset using Exa's Websets API. Provide a search object and optional enrichments, externalId, and metadata.",
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    search: z.object({}).passthrough().describe("Search object for the Webset"),
    enrichments: z.array(z.object({}).passthrough()).optional().describe("Array of enrichment objects"),
    externalId: z.string().optional().describe("External identifier for the Webset"),
    metadata: z.object({}).passthrough().optional().describe("Metadata key-value pairs")
  },
  handler: async ({ apiKey, search, enrichments, externalId, metadata }) => {
    const requestId = `create_webset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, 'create_webset');

    logger.start("Creating Webset");

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

      const payload: Record<string, any> = { search };
      if (enrichments) payload.enrichments = enrichments;
      if (externalId) payload.externalId = externalId;
      if (metadata) payload.metadata = metadata;

      logger.log("Sending request to Exa Websets API");

      const response = await axiosInstance.post("/websets/v0/websets", payload);

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



            text: `Create Webset error (${statusCode}): ${errorMessage}`
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: "text",
          text: `Create Webset error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  },
  enabled: true
};

toolRegistry["get_webset"] = {
  name: "get_webset",
  description: "Retrieve a Webset by ID from Exa's Websets API. Optionally expand with items.",
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    id: z.string().describe("The Webset ID to retrieve"),
    expand: z.string().optional().describe("Optional expand parameter, e.g., 'items'")
  },
  handler: async ({ apiKey, id, expand }) => {
    const requestId = `get_webset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, 'get_webset');

    logger.start(`Fetching Webset ${id}`);

    try {
      const axiosInstance = axios.create({
        baseURL: "https://api.exa.ai",
        headers: {
          'accept': 'application/json',
          'x-api-key': apiKey
        },
        timeout: 30000
      });

      const params: Record<string, any> = {};
      if (expand) params.expand = expand;

      logger.log("Sending GET request to Exa Websets API");

      const response = await axiosInstance.get(`/websets/v0/websets/${encodeURIComponent(id)}`, { params });

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
            text: `Get Webset error (${statusCode}): ${errorMessage}`
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: "text",
          text: `Get Webset error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  },
  enabled: true
};

toolRegistry["update_webset"] = {
  name: "update_webset",
  description: "Update a Webset's metadata using Exa's Websets API.",
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    id: z.string().describe("The Webset ID to update"),
    metadata: z.object({}).passthrough().optional().describe("Metadata key-value pairs to update")
  },
  handler: async ({ apiKey, id, metadata }) => {
    const requestId = `update_webset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, 'update_webset');

    logger.start(`Updating Webset ${id}`);

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

      const payload: Record<string, any> = {};
      if (metadata) payload.metadata = metadata;

      logger.log("Sending POST request to Exa Websets API");

      const response = await axiosInstance.post(`/websets/v0/websets/${encodeURIComponent(id)}`, payload);

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
            text: `Update Webset error (${statusCode}): ${errorMessage}`
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: "text",
          text: `Update Webset error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  },
  enabled: true
};




toolRegistry["list_websets"] = {
  name: "list_websets",
  description: "List all Websets using Exa's Websets API. Supports pagination.",
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    cursor: z.string().optional().describe("Pagination cursor"),
    limit: z.number().min(1).max(100).optional().describe("Number of Websets to return (1-100)")
  },
  handler: async ({ apiKey, cursor, limit }) => {
    const requestId = `list_websets-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, 'list_websets');

    logger.start("Listing Websets");

    try {
      const axiosInstance = axios.create({
        baseURL: "https://api.exa.ai",
        headers: {
          'accept': 'application/json',
          'x-api-key': apiKey
        },
        timeout: 30000
      });

      const params: Record<string, any> = {};
      if (cursor) params.cursor = cursor;
      if (limit) params.limit = limit;

      logger.log("Sending GET request to Exa Websets API");

      const response = await axiosInstance.get("/websets/v0/websets", { params });

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
            text: `List Websets error (${statusCode}): ${errorMessage}`
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: "text",
          text: `List Websets error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  },
  enabled: true
};


toolRegistry["cancel_webset"] = {
  name: "cancel_webset",
  description: "Cancel a running Webset by ID using Exa's Websets API.",
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    id: z.string().describe("The Webset ID to cancel")
  },
  handler: async ({ apiKey, id }) => {
    const requestId = `cancel_webset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, 'cancel_webset');

    logger.start(`Canceling Webset ${id}`);

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

      const response = await axiosInstance.post(`/websets/v0/websets/${encodeURIComponent(id)}/cancel`);

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
            text: `Cancel Webset error (${statusCode}): ${errorMessage}`
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: "text",
          text: `Cancel Webset error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  },
  enabled: true
};


toolRegistry["delete_webset"] = {
  name: "delete_webset",
  description: "Delete a Webset by ID using Exa's Websets API.",
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    id: z.string().describe("The Webset ID to delete")
  },
  handler: async ({ apiKey, id }) => {
    const requestId = `delete_webset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, 'delete_webset');

    logger.start(`Deleting Webset ${id}`);

    try {
      const axiosInstance = axios.create({
        baseURL: "https://api.exa.ai",
        headers: {
          'accept': 'application/json',
          'x-api-key': apiKey
        },
        timeout: 30000
      });

      logger.log("Sending DELETE request to Exa Websets API");

      const response = await axiosInstance.delete(`/websets/v0/websets/${encodeURIComponent(id)}`);

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
            text: `Delete Webset error (${statusCode}): ${errorMessage}`
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: "text",
          text: `Delete Webset error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  },
  enabled: true
};

