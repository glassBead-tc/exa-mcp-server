/**
 * Enhanced Webset Items tools using the exa-js SDK
 */
import { z } from "zod";
import { toolRegistry } from "../config.js";
import { createRequestLogger } from "../../utils/logger.js";
import { ExaWebsetsClient } from "../../utils/exaWebsetsClient.js"; // Corrected import

/**
 * Get all items from a Webset with advanced filtering and pagination
 */
toolRegistry["get_webset_items_enhanced"] = {
  name: "get_webset_items_enhanced",
  description: "Get all items from a Webset with advanced filtering and pagination using the exa-js SDK.",
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    websetId: z.string().describe("The ID of the Webset to get items from"),
    limit: z.number().min(1).max(100).optional().describe("Maximum number of items to return (1-100)"),
    cursor: z.string().optional().describe("Pagination cursor for retrieving the next page of results"),
    includeEnrichments: z.boolean().optional().describe("Whether to include enrichment data in the response")
  },
  handler: async ({ apiKey, websetId, limit, cursor, includeEnrichments = true }) => {
    const requestId = `get_webset_items_enhanced-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, 'get_webset_items_enhanced');

    logger.start(`Getting items for Webset ${websetId}`);

    try {
      // Create Exa client with the API key
      const exaClient = new ExaWebsetsClient(apiKey, requestId); // Use new constructor
      
      // Get items with pagination
      const response = await exaClient.listItems(websetId, { limit, cursor });
      
      // Format the response
      const formattedItems = response.data.map((item: any) => { // Added explicit 'any' type for item
        // Basic item data
        const formattedItem = {
          id: item.id,
          source: item.source,
          properties: item.properties,
          evaluations: item.evaluations,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        };
        
        // Include enrichments if requested
        if (includeEnrichments && item.enrichments) {
          return {
            ...formattedItem,
            enrichments: item.enrichments
          };
        }
        
        return formattedItem;
      });
      
      // Prepare pagination info
      const paginationInfo = {
        hasMore: response.hasMore,
        nextCursor: response.nextCursor
      };
      
      // Prepare a user-friendly response
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            items: formattedItems,
            pagination: paginationInfo,
            totalItems: formattedItems.length,
            message: `Retrieved ${formattedItems.length} items from Webset ${websetId}`,
            nextSteps: response.hasMore ? [
              `To get the next page of results, use the nextCursor: "${response.nextCursor}"`
            ] : []
          }, null, 2)
        }]
      };
    } catch (error) {
      logger.error(error);
      
      return {
        content: [{
          type: "text",
          text: `Error getting Webset items: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  },
  enabled: true
};

/**
 * Get a specific item from a Webset
 */
toolRegistry["get_webset_item"] = {
  name: "get_webset_item",
  description: "Get a specific item from a Webset by ID using the exa-js SDK.",
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    websetId: z.string().describe("The ID of the Webset"),
    itemId: z.string().describe("The ID of the item to retrieve")
  },
  handler: async ({ apiKey, websetId, itemId }) => {
    const requestId = `get_webset_item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, 'get_webset_item');

    logger.start(`Getting item ${itemId} from Webset ${websetId}`);

    try {
      // Create Exa client with the API key
      const exaClient = new ExaWebsetsClient(apiKey, requestId); // Use new constructor
      
      // Get the specific item
      const item = await exaClient.getItem(websetId, itemId);
      
      // Prepare a user-friendly response
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            item: {
              id: item.id,
              source: item.source,
              properties: item.properties,
              evaluations: item.evaluations,
              enrichments: item.enrichments,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt
            },
            message: `Retrieved item ${itemId} from Webset ${websetId}`
          }, null, 2)
        }]
      };
    } catch (error) {
      logger.error(error);
      
      return {
        content: [{
          type: "text",
          text: `Error getting Webset item: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  },
  enabled: true
};

/**
 * Delete an item from a Webset
 */
toolRegistry["delete_webset_item"] = {
  name: "delete_webset_item",
  description: "Delete a specific item from a Webset by ID using the exa-js SDK.",
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    websetId: z.string().describe("The ID of the Webset"),
    itemId: z.string().describe("The ID of the item to delete")
  },
  handler: async ({ apiKey, websetId, itemId }) => {
    const requestId = `delete_webset_item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, 'delete_webset_item');

    logger.start(`Deleting item ${itemId} from Webset ${websetId}`);

    try {
      // Create Exa client with the API key
      const exaClient = new ExaWebsetsClient(apiKey, requestId); // Use new constructor
      
      // Delete the item
      const deletedItem = await exaClient.deleteItem(websetId, itemId);
      
      // Prepare a user-friendly response
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            deletedItem: {
              id: deletedItem.id,
              websetId: deletedItem.websetId
            },
            message: `Successfully deleted item ${itemId} from Webset ${websetId}`
          }, null, 2)
        }]
      };
    } catch (error) {
      logger.error(error);
      
      return {
        content: [{
          type: "text",
          text: `Error deleting Webset item: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  },
  enabled: true
};
