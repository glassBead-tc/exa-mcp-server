import { z } from "zod";
import axios from "axios";
import { toolRegistry } from "../config.js";
import { createRequestLogger } from "../../utils/logger.js";
import { ExaWebsetsRequest, ExaWebsetsResponse } from "../../types.js";

toolRegistry["get_webset_status"] = {
  name: "get_webset_status",
  description: "Check the status of a Webset creation process and retrieve results when complete. Use this after creating a webset with the create_webset tool.",
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    websetId: z.string().describe("The Webset ID to check status for"),
    expand: z.string().optional().describe("Optional expand parameter, e.g., 'items' to include full results"),
    includeDetails: z.boolean().optional().describe("Whether to include detailed results. Default: true")
  },
  handler: async ({ apiKey, websetId, expand, includeDetails = true }) => {
    const requestId = `get_webset_status-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, 'get_webset_status');

    logger.start("Checking Webset status");

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

      // Build the URL with optional expand parameter
      let url = `/websets/v0/websets/${encodeURIComponent(websetId)}`;
      if (expand) {
        url += `?expand=${encodeURIComponent(expand)}`;
      }

      logger.log("Getting Webset status");
      const response = await axiosInstance.get<ExaWebsetsResponse>(url);

      // Calculate progress and determine if complete
      const websetData = response.data;
      const searchProgress = websetData.searches.length > 0 ?
        websetData.searches[0].progress.completion : 0;
      const searchStatus = websetData.searches.length > 0 ?
        websetData.searches[0].status : 'not_started';
      const isComplete = searchStatus === 'completed';
      const isCanceled = searchStatus === 'canceled';
      const progressPercent = Math.round(searchProgress * 100);

      // Prepare a user-friendly response
      let statusMessage = "";
      let nextSteps = [];

      if (isComplete) {
        statusMessage = "Webset creation completed successfully!";
        nextSteps = [
          "You can now use this webset for searches and other operations.",
          "To see the full results including items, use: get_webset_status(apiKey: 'your-api-key', websetId: '" + websetId + "', expand: 'items')",
          "To search within this webset, use the create_search tool."
        ];
      } else if (isCanceled) {
        statusMessage = "Webset creation was canceled.";
        nextSteps = [
          "You may want to create a new webset with the create_webset tool."
        ];
      } else {
        statusMessage = `Webset creation is in progress (${progressPercent}% complete).`;
        nextSteps = [
          "The process typically takes 10-15 minutes to complete.",
          "Check back later using this same tool to see when it's complete."
        ];
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            websetId: websetData.id,
            status: websetData.status,
            searchStatus,
            progressPercent,
            isComplete,
            isCanceled,
            message: statusMessage,
            nextSteps,
            ...(includeDetails && { details: websetData })
          }, null, 2)
        }],
        isError: isCanceled
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
            text: `Get Webset Status error (${statusCode}): ${errorMessage}`
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: "text",
          text: `Get Webset Status error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  },
  enabled: true
};

toolRegistry["create_webset"] = {
  name: "create_webset",
  description: "Create a Webset using Exa's Websets API. This tool initiates the webset creation process and returns immediately with a tracking ID. Webset creation typically takes 10-15 minutes to complete in the background.",
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    search: z.object({
      query: z.string().describe("Your search query. Required string describing what to look for."),
      count: z.number().min(1).optional().describe("Number of items to find. Default: 10"),
      entity: z.object({
        type: z.enum(["company"]).optional().describe("Entity type. Currently only 'company' is supported")
      }).optional().describe("Entity the Webset will return results for"),
      criteria: z.array(
        z.object({
          description: z.string().describe("Description of the criterion")
        })
      ).optional().describe("Criteria for evaluating results")
    }).describe("Search parameters for the Webset"),
    enrichments: z.array(
      z.object({
        description: z.string().describe("Description of the enrichment task"),
        format: z.enum(["text", "date", "number", "options", "email", "phone"]).optional()
          .describe("Format of the enrichment response"),
        options: z.array(
          z.object({
            label: z.string().describe("Label for the option")
          })
        ).optional().describe("Options for the enrichment"),
        metadata: z.record(z.string().max(1000)).optional().describe("Metadata for the enrichment")
      })
    ).optional().describe("Array of enrichment objects"),
    externalId: z.string().optional().describe("External identifier for the Webset"),
    metadata: z.record(z.string().max(1000)).optional().describe("Metadata key-value pairs")
  },
  handler: async (args, extra) => {
    const { apiKey, search, enrichments, externalId, metadata } = args;
    const requestId = `create_webset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, 'create_webset');

    // Extract progress token if present
    const progressToken = extra?.params?._meta?.progressToken;
    const shouldReportProgress = !!progressToken;
    const server = extra?.server;

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

      // Create the payload using the ExaWebsetsRequest type
      const payload: ExaWebsetsRequest = {
        search,
        ...(enrichments && { enrichments }),
        ...(externalId && { externalId }),
        ...(metadata && { metadata })
      };

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
      const response = await axiosInstance.post<ExaWebsetsResponse>("/websets/v0/websets", payload);

      logger.log("Received response from Exa Websets API");

      // Send progress update after creation
      if (shouldReportProgress && server && progressToken) {
        server.notification("notifications/progress", {
          progressToken,
          progress: 100,
          total: 100,
          message: "Webset creation initiated successfully"
        });
      }

      // Extract the webset ID and initial status from the response
      const websetId = response.data.id;
      const status = response.data.status;
      const searchStatus = response.data.searches.length > 0 ? response.data.searches[0].status : 'not_started';

      // Format a user-friendly response with clear instructions
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            websetId,
            status,
            searchStatus,
            message: "Webset creation has been initiated successfully. The process typically takes 10-15 minutes to complete in the background.",
            nextSteps: [
              "1. Your webset is now being created in the background.",
              "2. To check the status of your webset, use the get_webset_status tool with your websetId.",
              "3. Example: get_webset_status(apiKey: 'your-api-key', websetId: '" + websetId + "')",
              "4. When the status shows 'completed', you can retrieve the full results with expand='items'."
            ]
          }, null, 2)
        }]
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
  description: "[DEPRECATED] Retrieve a Webset by ID from Exa's Websets API. For Websets created with create_webset, use get_webset_status instead.",
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

      const response = await axiosInstance.get<ExaWebsetsResponse>(`/websets/v0/websets/${encodeURIComponent(id)}`, { params });

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
    metadata: z.record(z.string().max(1000)).optional().describe("Metadata key-value pairs to update")
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

      // Use a typed payload
      const payload = {
        metadata: metadata || {}
      };

      logger.log("Sending POST request to Exa Websets API");

      const response = await axiosInstance.post<ExaWebsetsResponse>(`/websets/v0/websets/${encodeURIComponent(id)}`, payload);

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

      // Create typed params object
      const params: Record<string, string | number> = {};
      if (cursor) params.cursor = cursor;
      if (limit) params.limit = limit;

      logger.log("Sending GET request to Exa Websets API");

      // Use typed response
      interface WebsetsListResponse {
        data: ExaWebsetsResponse[];
        hasMore: boolean;
        nextCursor: string | null;
      }

      const response = await axiosInstance.get<WebsetsListResponse>("/websets/v0/websets", { params });

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

      const response = await axiosInstance.post<ExaWebsetsResponse>(`/websets/v0/websets/${encodeURIComponent(id)}/cancel`);

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

      const response = await axiosInstance.delete<ExaWebsetsResponse>(`/websets/v0/websets/${encodeURIComponent(id)}`);

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

