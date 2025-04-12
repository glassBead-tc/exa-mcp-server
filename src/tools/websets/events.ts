// Purpose: Implements the Exa Websets Events API endpoints, enabling clients to retrieve event data with robust parameter validation, error handling, and modular design.
// Last updated: 2025-04-12

import { z } from "zod";
import axios from "axios";
import { toolRegistry, API_CONFIG } from "../config.js";
import { createRequestLogger } from "../../utils/logger.js";
import { ALLOWED_EVENTS } from "./webhooks.js";
import type { ExaBaseEvent, ExaEventListResponse } from "../../types.js";

// Zod schema for list events input validation
const listEventsSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  cursor: z.string().min(1).optional(),
  limit: z.number().min(1).max(200).optional(),
  types: z.array(
    z.enum([...ALLOWED_EVENTS] as [typeof ALLOWED_EVENTS[number], ...typeof ALLOWED_EVENTS[number][]])
  ).optional()
});

toolRegistry["list_events"] = {
  name: "list_events",
  description:
    "List all events that have occurred in the Exa Websets system. Supports pagination and filtering by event types. Returns events in descending order by creation time.",
  enabled: true,
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    cursor: z.string().optional().describe("Cursor for pagination"),
    limit: z.number().optional().describe("Number of results to return (1-200, default: 25)"),
    types: z.array(
      z.enum([...ALLOWED_EVENTS] as [typeof ALLOWED_EVENTS[number], ...typeof ALLOWED_EVENTS[number][]])
    ).optional().describe("Event types to filter by")
  },
  handler: async ({ apiKey, cursor, limit, types }) => {
    const requestId = `list_events-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 7)}`;
    const logger = createRequestLogger(requestId, "list_events");

    logger.start("Listing events");

    // Validate input
    const parseResult = listEventsSchema.safeParse({
      apiKey,
      cursor,
      limit,
      types
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
      const params: Record<string, string | number | string[]> = {};
      if (cursor) params.cursor = cursor;
      if (limit) params.limit = limit;
      if (types && types.length > 0) params.types = types;

      logger.log("Sending GET request to Exa Websets API");

      const response = await axiosInstance.get<ExaEventListResponse>(
        API_CONFIG.ENDPOINTS.WEBSETS.EVENTS,
        {
          params
        }
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
              text: `List Events error (${statusCode}): ${errorMessage}`
            }
          ],
          isError: true
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `List Events error: ${
              error instanceof Error ? error.message : String(error)
            }`
          }
        ],
        isError: true
      };
    }
  }
};

// Zod schema for get event input validation
const getEventSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  id: z.string().min(1, "Event ID is required")
});

toolRegistry["get_event"] = {
  name: "get_event",
  description:
    "Get a single event by ID from Exa Websets. Returns the event object on success.",
  enabled: true,
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    id: z.string().describe("The ID of the event to retrieve")
  },
  handler: async ({ apiKey, id }) => {
    const requestId = `get_event-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 7)}`;
    const logger = createRequestLogger(requestId, "get_event");

    logger.start(`Retrieving event with ID: ${id}`);

    // Validate input
    const parseResult = getEventSchema.safeParse({
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

      const response = await axiosInstance.get<ExaBaseEvent>(
        `${API_CONFIG.ENDPOINTS.WEBSETS.EVENTS}/${id}`
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
              text: `Get Event error (${statusCode}): ${errorMessage}`
            }
          ],
          isError: true
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Get Event error: ${
              error instanceof Error ? error.message : String(error)
            }`
          }
        ],
        isError: true
      };
    }
  }
};
