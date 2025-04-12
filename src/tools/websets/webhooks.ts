// Purpose: Implements the Exa Websets "Create a Webhook" endpoint, enabling clients to register webhooks for specific events with robust parameter validation, error handling, and modular design.
// Last updated: 2025-04-12

import { z } from "zod";
import axios from "axios";
import { toolRegistry, API_CONFIG } from "../config.js";
import { createRequestLogger } from "../../utils/logger.js";
import type { ExaWebhook, ExaWebhookListResponse, ExaWebhookAttemptListResponse } from "../../types.js";

// Allowed events for Exa Websets webhooks (should be kept in sync with Exa docs)
export const ALLOWED_EVENTS = [
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
];

// Zod schema for input validation
const createWebhookSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  events: z
    .array(z.enum([...ALLOWED_EVENTS] as [typeof ALLOWED_EVENTS[number], ...typeof ALLOWED_EVENTS[number][]]))
    .min(1, "At least one event is required"),
  url: z.string().url("A valid webhook URL is required"),
  metadata: z.record(z.string().max(1000)).optional()
});

toolRegistry["create_webhook"] = {
  name: "create_webhook",
  description:
    "Create a webhook for Exa Websets events. Registers a webhook for the specified events and URL. Returns the webhook object on success.",
  enabled: true,
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    events: z
      .array(z.enum([...ALLOWED_EVENTS] as [typeof ALLOWED_EVENTS[number], ...typeof ALLOWED_EVENTS[number][]]))
      .describe("Events to trigger the webhook"),
    url: z.string().describe("The URL to send the webhook to"),
    metadata: z
      .record(z.string().max(1000))
      .optional()
      .describe("Key-value metadata to associate with the webhook")
  },
  handler: async ({ apiKey, events, url, metadata }) => {
    const requestId = `create_webhook-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 7)}`;
    const logger = createRequestLogger(requestId, "create_webhook");

    logger.start(
      `Creating webhook for events: [${events.join(
        ", "
      )}] at URL: ${url}`
    );

    // Validate input
    const parseResult = createWebhookSchema.safeParse({
      apiKey,
      events,
      url,
      metadata
    });
    if (!parseResult.success) {
      logger.error("Validation failed");
      return {
        content: [
          {
            type: "text",
            text:
              "Validation error: " +
              parseResult.error.errors
                .map((e) => `${e.path.join(".")}: ${e.message}`)
                .join("; ")
          }
        ],
        isError: true
      };
    }

    try {
      const axiosInstance = axios.create({
        baseURL: API_CONFIG.BASE_URL,
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "x-api-key": apiKey
        },
        timeout: 30000
      });

      const payload = {
        events,
        url,
        ...(metadata ? { metadata } : {})
      };

      logger.log("Sending POST request to Exa Websets API");

      const response = await axiosInstance.post(
        API_CONFIG.ENDPOINTS.WEBSETS.WEBHOOKS,
        payload
      );

      logger.log("Received response from Exa Websets API");

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.data, null, 2)
          }
        ]
      };
    } catch (error) {
      logger.error(error);

      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status || "unknown";
        const errorMessage =
          error.response?.data?.message || error.message;

        logger.log(`Axios error (${statusCode}): ${errorMessage}`);
        return {
          content: [
            {
              type: "text",
              text: `Create Webhook error (${statusCode}): ${errorMessage}`
            }
          ],
          isError: true
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Create Webhook error: ${
              error instanceof Error ? error.message : String(error)
            }`
          }
        ],
        isError: true
      };
    }
  }
};

// Zod schema for get webhook input validation
const getWebhookSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  id: z.string().min(1, "Webhook ID is required")
});

toolRegistry["get_webhook"] = {
  name: "get_webhook",
  description:
    "Get a webhook by ID from Exa Websets. Returns the webhook object on success.",
  enabled: true,
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    id: z.string().describe("The ID of the webhook to retrieve")
  },
  handler: async ({ apiKey, id }) => {
    const requestId = `get_webhook-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 7)}`;
    const logger = createRequestLogger(requestId, "get_webhook");

    logger.start(`Retrieving webhook with ID: ${id}`);

    // Validate input
    const parseResult = getWebhookSchema.safeParse({
      apiKey,
      id
    });
    if (!parseResult.success) {
      logger.error("Validation failed");
      return {
        content: [
          {
            type: "text",
            text:
              "Validation error: " +
              parseResult.error.errors
                .map((e) => `${e.path.join(".")}: ${e.message}`)
                .join("; ")
          }
        ],
        isError: true
      };
    }

    try {
      const axiosInstance = axios.create({
        baseURL: API_CONFIG.BASE_URL,
        headers: {
          accept: "application/json",
          "x-api-key": apiKey
        },
        timeout: 30000
      });

      logger.log("Sending GET request to Exa Websets API");

      const response = await axiosInstance.get(
        `${API_CONFIG.ENDPOINTS.WEBSETS.WEBHOOKS}/${id}`
      );

      logger.log("Received response from Exa Websets API");

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.data, null, 2)
          }
        ]
      };
    } catch (error) {
      logger.error(error);

      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status || "unknown";
        const errorMessage =
          error.response?.data?.message || error.message;

        logger.log(`Axios error (${statusCode}): ${errorMessage}`);
        return {
          content: [
            {
              type: "text",
              text: `Get Webhook error (${statusCode}): ${errorMessage}`
            }
          ],
          isError: true
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Get Webhook error: ${
              error instanceof Error ? error.message : String(error)
            }`
          }
        ],
        isError: true
      };
    }
  }
};

// Zod schema for update webhook input validation
const updateWebhookSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  id: z.string().min(1, "Webhook ID is required"),
  events: z
    .array(z.enum([...ALLOWED_EVENTS] as [typeof ALLOWED_EVENTS[number], ...typeof ALLOWED_EVENTS[number][]]))
    .optional(),
  url: z.string().url("A valid webhook URL is required").optional(),
  metadata: z.record(z.string().max(1000)).optional()
});

toolRegistry["update_webhook"] = {
  name: "update_webhook",
  description:
    "Update an existing webhook for Exa Websets. Allows modifying events, URL, and metadata of a webhook. Returns the updated webhook object on success.",
  enabled: true,
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    id: z.string().describe("The ID of the webhook to update"),
    events: z
      .array(z.enum([...ALLOWED_EVENTS] as [typeof ALLOWED_EVENTS[number], ...typeof ALLOWED_EVENTS[number][]]))
      .optional()
      .describe("New events to trigger the webhook (optional)"),
    url: z.string().optional().describe("New URL to send the webhook to (optional)"),
    metadata: z
      .record(z.string().max(1000))
      .optional()
      .describe("New key-value metadata to associate with the webhook (optional)")
  },
  handler: async ({ apiKey, id, events, url, metadata }) => {
    const requestId = `update_webhook-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 7)}`;
    const logger = createRequestLogger(requestId, "update_webhook");

    logger.start(`Updating webhook with ID: ${id}`);

    // Validate input
    const parseResult = updateWebhookSchema.safeParse({
      apiKey,
      id,
      events,
      url,
      metadata
    });
    if (!parseResult.success) {
      logger.error("Validation failed");
      return {
        content: [
          {
            type: "text",
            text:
              "Validation error: " +
              parseResult.error.errors
                .map((e) => `${e.path.join(".")}: ${e.message}`)
                .join("; ")
          }
        ],
        isError: true
      };
    }

    try {
      const axiosInstance = axios.create({
        baseURL: API_CONFIG.BASE_URL,
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "x-api-key": apiKey
        },
        timeout: 30000
      });

      // Build payload with only the provided fields
      const payload: Record<string, any> = {};
      if (events) payload.events = events;
      if (url) payload.url = url;
      if (metadata) payload.metadata = metadata;

      logger.log("Sending PATCH request to Exa Websets API");

      const response = await axiosInstance.patch(
        `${API_CONFIG.ENDPOINTS.WEBSETS.WEBHOOKS}/${id}`,
        payload
      );

      logger.log("Received response from Exa Websets API");

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.data, null, 2)
          }
        ]
      };
    } catch (error) {
      logger.error(error);

      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status || "unknown";
        const errorMessage =
          error.response?.data?.message || error.message;

        logger.log(`Axios error (${statusCode}): ${errorMessage}`);
        return {
          content: [
            {
              type: "text",
              text: `Update Webhook error (${statusCode}): ${errorMessage}`
            }
          ],
          isError: true
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Update Webhook error: ${
              error instanceof Error ? error.message : String(error)
            }`
          }
        ],
        isError: true
      };
    }
  }
};

// Zod schema for delete webhook input validation
const deleteWebhookSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  id: z.string().min(1, "Webhook ID is required")
});

toolRegistry["delete_webhook"] = {
  name: "delete_webhook",
  description:
    "Delete a webhook from Exa Websets by ID. Returns the deleted webhook object on success.",
  enabled: true,
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    id: z.string().describe("The ID of the webhook to delete")
  },
  handler: async ({ apiKey, id }) => {
    const requestId = `delete_webhook-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 7)}`;
    const logger = createRequestLogger(requestId, "delete_webhook");

    logger.start(`Deleting webhook with ID: ${id}`);

    // Validate input
    const parseResult = deleteWebhookSchema.safeParse({
      apiKey,
      id
    });
    if (!parseResult.success) {
      logger.error("Validation failed");
      return {
        content: [
          {
            type: "text",
            text:
              "Validation error: " +
              parseResult.error.errors
                .map((e) => `${e.path.join(".")}: ${e.message}`)
                .join("; ")
          }
        ],
        isError: true
      };
    }

    try {
      const axiosInstance = axios.create({
        baseURL: API_CONFIG.BASE_URL,
        headers: {
          accept: "application/json",
          "x-api-key": apiKey
        },
        timeout: 30000
      });

      logger.log("Sending DELETE request to Exa Websets API");

      const response = await axiosInstance.delete(
        `${API_CONFIG.ENDPOINTS.WEBSETS.WEBHOOKS}/${id}`
      );

      logger.log("Received response from Exa Websets API");

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.data, null, 2)
          }
        ]
      };
    } catch (error) {
      logger.error(error);

      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status || "unknown";
        const errorMessage =
          error.response?.data?.message || error.message;

        logger.log(`Axios error (${statusCode}): ${errorMessage}`);
        return {
          content: [
            {
              type: "text",
              text: `Delete Webhook error (${statusCode}): ${errorMessage}`
            }
          ],
          isError: true
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Delete Webhook error: ${
              error instanceof Error ? error.message : String(error)
            }`
          }
        ],
        isError: true
      };
    }
  }
};

// Zod schema for list webhooks input validation
const listWebhooksSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  cursor: z.string().min(1).optional(),
  limit: z.number().min(1).max(200).optional()
});

toolRegistry["list_webhooks"] = {
  name: "list_webhooks",
  description:
    "List webhooks from Exa Websets. Supports pagination. Returns a list of webhooks.",
  enabled: true,
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    cursor: z.string().optional().describe("Cursor for pagination"),
    limit: z.number().optional().describe("Number of results to return (1-200, default: 25)")
  },
  handler: async ({ apiKey, cursor, limit }) => {
    const requestId = `list_webhooks-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 7)}`;
    const logger = createRequestLogger(requestId, "list_webhooks");

    logger.start("Listing webhooks");

    // Validate input
    const parseResult = listWebhooksSchema.safeParse({
      apiKey,
      cursor,
      limit
    });
    if (!parseResult.success) {
      logger.error("Validation failed");
      return {
        content: [
          {
            type: "text",
            text:
              "Validation error: " +
              parseResult.error.errors
                .map((e) => `${e.path.join(".")}: ${e.message}`)
                .join("; ")
          }
        ],
        isError: true
      };
    }

    try {
      const axiosInstance = axios.create({
        baseURL: API_CONFIG.BASE_URL,
        headers: {
          accept: "application/json",
          "x-api-key": apiKey
        },
        timeout: 30000
      });

      // Build query parameters
      const params: Record<string, string | number> = {};
      if (cursor) params.cursor = cursor;
      if (limit) params.limit = limit;

      logger.log("Sending GET request to Exa Websets API");

      const response = await axiosInstance.get(API_CONFIG.ENDPOINTS.WEBSETS.WEBHOOKS, {
        params
      });

      logger.log("Received response from Exa Websets API");

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.data, null, 2)
          }
        ]
      };
    } catch (error) {
      logger.error(error);

      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status || "unknown";
        const errorMessage =
          error.response?.data?.message || error.message;

        logger.log(`Axios error (${statusCode}): ${errorMessage}`);
        return {
          content: [
            {
              type: "text",
              text: `List Webhooks error (${statusCode}): ${errorMessage}`
            }
          ],
          isError: true
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `List Webhooks error: ${
              error instanceof Error ? error.message : String(error)
            }`
          }
        ],
        isError: true
      };
    }
  }
};

// Zod schema for list webhook attempts input validation
const listWebhookAttemptsSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  id: z.string().min(1, "Webhook ID is required"),
  cursor: z.string().min(1).optional(),
  limit: z.number().min(1).max(200).optional(),
  eventType: z.enum([...ALLOWED_EVENTS] as [typeof ALLOWED_EVENTS[number], ...typeof ALLOWED_EVENTS[number][]]).optional()
});

toolRegistry["list_webhook_attempts"] = {
  name: "list_webhook_attempts",
  description:
    "List all attempts made by a webhook from Exa Websets. Supports pagination and filtering by event type. Returns a list of webhook attempts ordered in descending order.",
  enabled: true,
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    id: z.string().describe("The ID of the webhook"),
    cursor: z.string().optional().describe("Cursor for pagination"),
    limit: z.number().optional().describe("Number of results to return (1-200, default: 25)"),
    eventType: z.enum([...ALLOWED_EVENTS] as [typeof ALLOWED_EVENTS[number], ...typeof ALLOWED_EVENTS[number][]]).optional()
      .describe("The type of event to filter by")
  },
  handler: async ({ apiKey, id, cursor, limit, eventType }) => {
    const requestId = `list_webhook_attempts-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 7)}`;
    const logger = createRequestLogger(requestId, "list_webhook_attempts");

    logger.start(`Listing attempts for webhook ID: ${id}`);

    // Validate input
    const parseResult = listWebhookAttemptsSchema.safeParse({
      apiKey,
      id,
      cursor,
      limit,
      eventType
    });
    if (!parseResult.success) {
      logger.error("Validation failed");
      return {
        content: [
          {
            type: "text",
            text:
              "Validation error: " +
              parseResult.error.errors
                .map((e) => `${e.path.join(".")}: ${e.message}`)
                .join("; ")
          }
        ],
        isError: true
      };
    }

    try {
      const axiosInstance = axios.create({
        baseURL: API_CONFIG.BASE_URL,
        headers: {
          accept: "application/json",
          "x-api-key": apiKey
        },
        timeout: 30000
      });

      // Build query parameters
      const params: Record<string, string | number> = {};
      if (cursor) params.cursor = cursor;
      if (limit) params.limit = limit;
      if (eventType) params.eventType = eventType;

      logger.log("Sending GET request to Exa Websets API");

      const response = await axiosInstance.get(`${API_CONFIG.ENDPOINTS.WEBSETS.WEBHOOKS}/${id}/attempts`, {
        params
      });

      logger.log("Received response from Exa Websets API");

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.data, null, 2)
          }
        ]
      };
    } catch (error) {
      logger.error(error);

      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status || "unknown";
        const errorMessage =
          error.response?.data?.message || error.message;

        logger.log(`Axios error (${statusCode}): ${errorMessage}`);
        return {
          content: [
            {
              type: "text",
              text: `List Webhook Attempts error (${statusCode}): ${errorMessage}`
            }
          ],
          isError: true
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `List Webhook Attempts error: ${
              error instanceof Error ? error.message : String(error)
            }`
          }
        ],
        isError: true
      };
    }
  }
};
