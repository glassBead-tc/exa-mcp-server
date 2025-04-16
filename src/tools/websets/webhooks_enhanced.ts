/**
 * Enhanced Webset Webhooks tools using the exa-js SDK
 */
import { z } from "zod";
import { toolRegistry } from "../config.js";
import { createRequestLogger } from "../../utils/logger.js";
import { ExaWebsetsClient } from "../../utils/exaWebsetsClient.js"; // Corrected import
import { EventType, Webhook } from "exa-js"; // Added Webhook type

/**
 * Create a new webhook for Webset events
 */
toolRegistry["create_webset_webhook"] = {
  name: "create_webset_webhook",
  description: "Create a new webhook for Webset events using the exa-js SDK.",
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    url: z.string().url().describe("The URL to send webhook events to"),
    events: z.array(
      z.enum([
        "webset.created",
        "webset.deleted",
        "webset.paused",
        "webset.idle",
        "webset.search.created",
        "webset.search.canceled",
        "webset.search.completed",
        "webset.search.updated",
        "webset.export.created",
        "webset.export.completed",
        "webset.item.created",
        "webset.item.enriched"
      ])
    ).describe("Array of event types to subscribe to"),
    metadata: z.record(z.string()).optional().describe("Metadata for the webhook")
  },
  handler: async ({ apiKey, url, events, metadata }) => {
    const requestId = `create_webset_webhook-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, 'create_webset_webhook');

    logger.start(`Creating webhook for URL ${url}`);

    try {
      // Create Exa client with the API key
      const exaClient = new ExaWebsetsClient(apiKey, requestId); // Use new constructor
      
      // Create the webhook
      const webhook = await exaClient.createWebhook({
        url,
        events: events as EventType[],
        metadata
      });
      
      // Prepare a user-friendly response
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            webhook: {
              id: webhook.id,
              url: webhook.url,
              status: webhook.status,
              events: webhook.events,
              createdAt: webhook.createdAt
            },
            message: `Successfully created webhook for URL ${url}`,
            nextSteps: [
              "The webhook will receive events for the specified event types.",
              "You can list your webhooks using the list_webset_webhooks tool."
            ]
          }, null, 2)
        }]
      };
    } catch (error) {
      logger.error(error);
      
      return {
        content: [{
          type: "text",
          text: `Error creating webhook: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  },
  enabled: true
};

/**
 * List all webhooks
 */
toolRegistry["list_webset_webhooks"] = {
  name: "list_webset_webhooks",
  description: "List all webhooks for Webset events using the exa-js SDK.",
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    limit: z.number().min(1).max(100).optional().describe("Maximum number of webhooks to return (1-100)"),
    cursor: z.string().optional().describe("Pagination cursor for retrieving the next page of results")
  },
  handler: async ({ apiKey, limit, cursor }) => {
    const requestId = `list_webset_webhooks-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, 'list_webset_webhooks');

    logger.start("Listing webhooks");

    try {
      // Create Exa client with the API key
      const exaClient = new ExaWebsetsClient(apiKey, requestId); // Use new constructor
      
      // List the webhooks
      const response = await exaClient.listWebhooks({ limit, cursor });
      
      // Format the webhooks
      const formattedWebhooks = response.data.map((webhook: Webhook) => ({ // Used correct Webhook type
        id: webhook.id,
        url: webhook.url,
        status: webhook.status,
        events: webhook.events,
        createdAt: webhook.createdAt,
        updatedAt: webhook.updatedAt
      }));
      
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
            webhooks: formattedWebhooks,
            pagination: paginationInfo,
            totalWebhooks: formattedWebhooks.length,
            message: `Retrieved ${formattedWebhooks.length} webhooks`,
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
          text: `Error listing webhooks: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  },
  enabled: true
};
