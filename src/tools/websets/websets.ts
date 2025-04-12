import { z } from "zod";
import axios from "axios";
import { toolRegistry } from "../config.js";
import { createRequestLogger } from "../../utils/logger.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";

// Define the types for the handler parameters
interface CreateWebsetArgs {
  apiKey: string;
  search: Record<string, unknown>;
  enrichments?: Array<Record<string, unknown>>;
  externalId?: string;
  metadata?: Record<string, unknown>;
  pollInterval?: number;
}

interface RequestParams {
  _meta?: {
    progressToken?: string | number;
  };
}

toolRegistry["create_webset"] = {
  name: "create_webset",
  description: "Create a Webset using Exa's Websets API. Provide a search object and optional enrichments, externalId, and metadata. This operation may take a long time to complete, and progress updates will be provided.",
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    search: z.object({}).passthrough().describe("Search object for the Webset"),
    enrichments: z.array(z.object({}).passthrough()).optional().describe("Array of enrichment objects"),
    externalId: z.string().optional().describe("External identifier for the Webset"),
    metadata: z.object({}).passthrough().optional().describe("Metadata key-value pairs"),
    pollInterval: z.number().min(1000).max(60000).optional().describe("Polling interval in milliseconds (1000-60000). Default: 5000")
  },
  handler: async (args, extra) => {
    const { apiKey, search, enrichments, externalId, metadata, pollInterval } = args;
    const requestId = `create_webset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, 'create_webset');

    // Extract progress token if present
    const progressToken = extra?.params?._meta?.progressToken;
    const shouldReportProgress = !!progressToken;
    const server = extra?.server;
    
    // Set default polling interval if not provided
    const interval = pollInterval || 5000;

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

      // Send initial progress notification
      if (shouldReportProgress && server && progressToken) {
        server.notification("notifications/progress", {
          progressToken,
          progress: 0,
          message: "Initiating Webset creation..."
        });
      }

      // Create the Webset
      const response = await axiosInstance.post("/websets/v0/websets", payload);
      
      logger.log("Received initial response from Exa Websets API");
      
      // Send progress update after initial creation
      if (shouldReportProgress && server && progressToken) {
        server.notification("notifications/progress", {
          progressToken,
          progress: 10,
          message: "Webset creation started, waiting for processing..."
        });
      }

      // Extract the webset ID from the response
      const websetId = response.data.id;
      
      // If the status is already 'completed', return the result
      if (response.data.status === 'completed') {
        if (shouldReportProgress && server && progressToken) {
          server.notification("notifications/progress", {
            progressToken,
            progress: 100,
            total: 100,
            message: "Webset creation completed"
          });
        }
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify(response.data, null, 2)
          }]
        };
      }
      
      // Poll for status until completion or error
      let websetData = response.data;
      let attempts = 0;
      const maxAttempts = 60; // Limit polling to prevent infinite loops
      
      while (websetData.status !== 'completed' && websetData.status !== 'failed' && attempts < maxAttempts) {
        // Wait for the specified interval
        await new Promise(resolve => setTimeout(resolve, interval));
        
        attempts++;
        
        // Calculate progress based on attempts (this is an estimate)
        const progressPercent = Math.min(10 + Math.floor((attempts / maxAttempts) * 80), 90);
        
        if (shouldReportProgress && server && progressToken) {
          server.notification("notifications/progress", {
            progressToken,
            progress: progressPercent,
            total: 100,
            message: `Polling Webset status (${websetData.status})...`
          });
        }
        
        // Fetch the current status
        try {
          logger.log(`Polling Webset status (attempt ${attempts})`);
          const statusResponse = await axiosInstance.get(`/websets/v0/websets/${encodeURIComponent(websetId)}`);
          websetData = statusResponse.data;
          
          // If the Webset has specific progress indicators, we could use those here
          if (websetData.progress) {
            const actualProgress = Math.floor(10 + (websetData.progress * 90));
            
            if (shouldReportProgress && server && progressToken) {
              server.notification("notifications/progress", {
                progressToken,
                progress: actualProgress,
                total: 100,
                message: `Webset processing: ${websetData.status}`
              });
            }
          }
        } catch (error) {
          logger.error(`Error polling webset status: ${error}`);
          // Continue polling despite errors
        }
      }
      
      // Final progress update
      if (shouldReportProgress && server && progressToken) {
        server.notification("notifications/progress", {
          progressToken,
          progress: 100,
          total: 100,
          message: websetData.status === 'completed' ? 
            "Webset creation completed" : 
            `Webset creation ${websetData.status === 'failed' ? 'failed' : 'timed out'}`
        });
      }
      
      logger.log(`Webset creation ${websetData.status}`);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify(websetData, null, 2)
        }],
        isError: websetData.status === 'failed'
      };
    } catch (error) {
      logger.error(error);

      // Send error progress update
      if (shouldReportProgress && server && progressToken) {
        server.notification("notifications/progress", {
          progressToken,
          progress: 100,
          total: 100,
          message: "Webset creation failed with error"
        });
      }

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

