import { z } from "zod";
import axios from "axios";
import { toolRegistry } from "../config.js";
import { createRequestLogger } from "../../utils/logger.js";
import { ExaWebsetsResponse } from "../../types.js";

// Define type for the item response based on the ExaWebsetsResponse.items type
type WebsetItemResponse = NonNullable<ExaWebsetsResponse["items"]>[number];

// Interface for the list items response
interface WebsetItemsListResponse {
  data: WebsetItemResponse[];
  hasMore: boolean;
  nextCursor: string | null;
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

      const response = await axiosInstance.get<WebsetItemResponse>(`/websets/v0/websets/${encodeURIComponent(webset)}/items/${encodeURIComponent(id)}`);

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
            text: `Get Item error (${statusCode}): ${errorMessage}`
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: "text",
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

      const response = await axiosInstance.delete<WebsetItemResponse>(`/websets/v0/websets/${encodeURIComponent(webset)}/items/${encodeURIComponent(id)}`);

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
            text: `Delete Item error (${statusCode}): ${errorMessage}`
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: "text",
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
  description: "Stream all Items for a Webset using Exa's Websets API.",
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    webset: z.string().describe("The Webset ID"),
    batchSize: z.number().min(1).max(100).default(50).describe("Number of items to fetch per batch"),
    limit: z.number().optional().describe("Maximum number of items to return"),
    streamFormat: z.enum(["text", "json"]).default("json").describe("Format for the response")
  },
  handler: async ({ apiKey, webset, batchSize, limit, streamFormat }) => {
    const requestId = `list_items-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, 'list_items');

    logger.start(`Listing Items for Webset ${webset}`);

    try {
      const axiosInstance = axios.create({
        baseURL: "https://api.exa.ai",
        headers: {
          'accept': 'application/json',
          'x-api-key': apiKey
        },
        timeout: 30000
      });

      // Define typed parameters
      const params: Record<string, string | number> = {
        limit: batchSize
      };

      let cursor: string | null = null;
      let itemsReturned = 0;
      let allItems: WebsetItemResponse[] = [];
      let shouldContinue = true;

      while (shouldContinue) {
        if (cursor) {
          params.cursor = cursor;
        }

        logger.log(`Sending GET request to Exa Websets API with cursor: ${cursor || 'initial'}`);

        const response = await axiosInstance.get<WebsetItemsListResponse>(`/websets/v0/websets/${encodeURIComponent(webset)}/items`, { params });

        logger.log(`Received batch of ${response.data.data.length} items`);

        // Add items to our collection
        allItems = allItems.concat(response.data.data);
        itemsReturned += response.data.data.length;

        // Check if we should fetch more
        cursor = response.data.nextCursor;
        
        // Stop if no more items, reached limit, or no hasMore
        if (!response.data.hasMore || !cursor || (limit !== undefined && itemsReturned >= limit)) {
          shouldContinue = false;
        }
      }

      // Apply limit if specified
      if (limit !== undefined && allItems.length > limit) {
        allItems = allItems.slice(0, limit);
      }

      logger.log(`Total items returned: ${allItems.length}`);

      // Return in the requested format
      if (streamFormat === "json") {
        return {
          content: [{
            type: "text",
            text: JSON.stringify(allItems, null, 2)
          }]
        };
      } else {
        // For text format, just output URLs and titles
        const textOutput = allItems.map(item => {
          const url = item.properties.url;
          const title = item.properties.type === "person" ? 
            item.properties.person.name : 
            `Item ${item.id}`;
          
          return `${title}\n${url}\n${'-'.repeat(40)}`;
        }).join('\n\n');
        
        return {
          content: [{
            type: "text",
            text: textOutput
          }]
        };
      }
    } catch (error) {
      logger.error(error);

      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status || 'unknown';
        const errorMessage = error.response?.data?.message || error.message;

        logger.log(`Axios error (${statusCode}): ${errorMessage}`);
        return {
          content: [{
            type: "text",
            text: `List Items error (${statusCode}): ${errorMessage}`
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: "text",
          text: `List Items error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  },
  enabled: true
};