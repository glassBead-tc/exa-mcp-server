import { z } from "zod";
import axios from "axios";
import { toolRegistry } from "../config.js";
import { createRequestLogger } from "../../utils/logger.js";
import { Readable } from "stream";

// Define the return type of createRequestLogger for correct typing
type RequestLogger = ReturnType<typeof createRequestLogger>;

// Helper function to handle errors consistently
function handleError(error: unknown, logger: RequestLogger) {
  if (axios.isAxiosError(error)) {
    const statusCode = error.response?.status || 'unknown';
    const errorMessage = error.response?.data?.message || error.message;

    logger.log(`Axios error (${statusCode}): ${errorMessage}`);
    return {
      content: [{
        type: "text" as const,
        text: `List Items error (${statusCode}): ${errorMessage}`
      }],
      isError: true
    };
  }

  return {
    content: [{
      type: "text" as const,
      text: `List Items error: ${error instanceof Error ? error.message : String(error)}`
    }],
    isError: true
  };
}

// Helper function to format error messages
function formatErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const statusCode = error.response?.status || 'unknown';
    const errorMessage = error.response?.data?.message || error.message;
    return `HTTP ${statusCode}: ${errorMessage}`;
  }
  return error instanceof Error ? error.message : String(error);
}

toolRegistry["get_item"] = {
  name: "get_item",
  description: "Retrieve a specific Item from a Webset using Exa's Websets API.",
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    webset: z.string().describe("The Webset ID"),
    id: z.string().describe("The Item ID")
  },
  handler: async ({ apiKey, webset, id }) => {
    const requestId = `get_item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, 'get_item');

    logger.start(`Fetching Item ${id} from Webset ${webset}`);

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

      const response = await axiosInstance.get(`/websets/v0/websets/${encodeURIComponent(webset)}/items/${encodeURIComponent(id)}`);

      logger.log("Received response from Exa Websets API");

      return {
        content: [{
          type: "text" as const,
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
            type: "text" as const,
            text: `Get Item error (${statusCode}): ${errorMessage}`
          }],
          isError: true
        };
      }
  
      return {
        content: [{
          type: "text" as const,
          text: `Get Item error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  },
  enabled: true
};


toolRegistry["delete_item"] = {
  name: "delete_item",
  description: "Delete a specific Item from a Webset using Exa's Websets API.",
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    webset: z.string().describe("The Webset ID"),
    id: z.string().describe("The Item ID")
  },
  handler: async ({ apiKey, webset, id }) => {
    const requestId = `delete_item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, 'delete_item');

    logger.start(`Deleting Item ${id} from Webset ${webset}`);

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

      const response = await axiosInstance.delete(`/websets/v0/websets/${encodeURIComponent(webset)}/items/${encodeURIComponent(id)}`);

      logger.log("Received response from Exa Websets API");

      return {
        content: [{
          type: "text" as const,
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
            type: "text" as const,
            text: `Delete Item error (${statusCode}): ${errorMessage}`
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: "text" as const,
          text: `Delete Item error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  },
  enabled: true
};


toolRegistry["list_items"] = {
  name: "list_items",
  description: "Stream all Items for a Webset using Exa's Websets API. Efficiently processes large result sets by streaming items in real-time.",
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    webset: z.string().describe("The Webset ID"),
    batchSize: z.number().min(1).max(200).optional().describe("Number of items to process in each batch (1-200, default: 50)"),
    limit: z.number().min(1).optional().describe("Maximum total number of items to return (optional)"),
    streamFormat: z.enum(["jsonl", "json"]).optional().describe("Format for streaming: 'jsonl' (default) for line-delimited JSON or 'json' for a complete JSON array")
  },
  handler: async (args, extra) => {
    const { apiKey, webset, batchSize = 50, limit, streamFormat = "jsonl" } = args;
    const requestId = `list_items-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, 'list_items');
    const server = extra?.server;

    logger.start(`Streaming Items for Webset ${webset}`);

    // Check if we're in a streaming-compatible environment
    const supportsStreaming = !!server?.streamResponse;
    
    // If streaming is not supported, fall back to pagination
    if (!supportsStreaming) {
      logger.log("Streaming not supported, falling back to pagination");
      try {
        const axiosInstance = axios.create({
          baseURL: "https://api.exa.ai",
          headers: {
            'accept': 'application/json',
            'x-api-key': apiKey
          },
          timeout: 30000
        });

        // Use the first batch size as the pagination limit
        const params = { limit: batchSize };
        const response = await axiosInstance.get(`/websets/v0/websets/${encodeURIComponent(webset)}/items`, { params });

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify(response.data, null, 2)
          }]
        };
      } catch (error) {
        logger.error(error);
        return handleError(error, logger);
      }
    }

    // If we're here, streaming is supported
    logger.log("Using HTTP streaming for item retrieval");

    // Create a readable stream to push items through
    const itemStream = new Readable({
      objectMode: true,
      read() {} // No-op since we'll push manually
    });

    // Set up the stream response with the appropriate content type
    const contentType = streamFormat === "jsonl" ? "application/x-ndjson" : "application/json";
    server.streamResponse({
      contentType,
      stream: itemStream
    });

    // Handle initialization for JSON array format
    if (streamFormat === "json") {
      itemStream.push("[");
    }

    try {
      const axiosInstance = axios.create({
        baseURL: "https://api.exa.ai",
        headers: {
          'accept': 'application/json',
          'x-api-key': apiKey
        },
        timeout: 30000
      });

      let cursor = undefined;
      let totalRetrieved = 0;
      let hasMore = true;
      let isFirstItem = true;

      // Fetch and stream items in batches
      while (hasMore && (!limit || totalRetrieved < limit)) {
        const params: Record<string, any> = { 
          limit: batchSize 
        };
        if (cursor) {
          params.cursor = cursor;
        }

        logger.log(`Fetching batch of items${cursor ? ' with cursor' : ''}`);
        const response = await axiosInstance.get(`/websets/v0/websets/${encodeURIComponent(webset)}/items`, { params });
        
        const items = response.data.items || [];
        hasMore = !!response.data.nextCursor;
        cursor = response.data.nextCursor;
        
        // Stream each item
        for (const item of items) {
          if (limit && totalRetrieved >= limit) {
            break;
          }

          if (streamFormat === "jsonl") {
            // For JSONL format, send each item as a complete JSON object on a new line
            itemStream.push(JSON.stringify(item) + "\n");
          } else {
            // For JSON array format, format with commas between items
            if (!isFirstItem) {
              itemStream.push(",");
            }
            itemStream.push(JSON.stringify(item, null, 2));
            isFirstItem = false;
          }
          
          totalRetrieved++;
        }

        // Break if we've hit our limit or there are no more items
        if (limit && totalRetrieved >= limit) {
          logger.log(`Reached requested limit of ${limit} items`);
          break;
        }
        
        if (!hasMore) {
          logger.log("No more items available");
          break;
        }
      }

      // Close the JSON array if using that format
      if (streamFormat === "json") {
        itemStream.push("]");
      }

      // End the stream
      itemStream.push(null);
      logger.log(`Successfully streamed ${totalRetrieved} items`);

      // Return empty content since we're streaming the response
      return { content: [] };
    } catch (error) {
      logger.error(error);
      
      // Handle errors by pushing error information to the stream and ending it
      try {
        const isFirstItem = true; // Reset this for error handling
        if (streamFormat === "jsonl") {
          itemStream.push(JSON.stringify({ error: formatErrorMessage(error) }) + "\n");
        } else {
          // For JSON array format, ensure valid JSON even in error cases
          if (!isFirstItem) {
            itemStream.push(",");
          }
          itemStream.push(JSON.stringify({ error: formatErrorMessage(error) }, null, 2));
          itemStream.push("]");
        }
        itemStream.push(null);
      } catch (streamError) {
        logger.error(`Error while handling stream error: ${streamError}`);
      }
      
      // Return empty content since we're streaming the response, including errors
      return { content: [] };
    }
  },
  enabled: true
};