// Purpose: Implements the Exa Websets Events API endpoints, enabling clients to retrieve event data with robust parameter validation, error handling, and modular design.
// Last updated: 2025-04-12

import { z } from "zod";
import axios from "axios";
import { toolRegistry, API_CONFIG } from "../config.js";
import { createRequestLogger } from "../../utils/logger.js";
import { ALLOWED_EVENTS } from "./webhooks.js";
import type { ExaBaseEvent, ExaEventListResponse } from "../../types.js";
import { Readable } from "stream";

// Define the return type of createRequestLogger for correct typing
type RequestLogger = ReturnType<typeof createRequestLogger>;

// Helper function to format error messages
function formatErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const statusCode = error.response?.status || 'unknown';
    const errorMessage = error.response?.data?.message || error.message;
    return `HTTP ${statusCode}: ${errorMessage}`;
  }
  return error instanceof Error ? error.message : String(error);
}

// Helper function to handle errors consistently
function handleError(error: unknown, logger: RequestLogger) {
  if (axios.isAxiosError(error)) {
    const statusCode = error.response?.status || 'unknown';
    const errorMessage = error.response?.data?.message || error.message;

    logger.log(`Axios error (${statusCode}): ${errorMessage}`);
    return {
      content: [{
        type: "text" as const,
        text: `List Events error (${statusCode}): ${errorMessage}`
      }],
      isError: true
    };
  }

  return {
    content: [{
      type: "text" as const,
      text: `List Events error: ${error instanceof Error ? error.message : String(error)}`
    }],
    isError: true
  };
}

// Zod schema for list events input validation
const listEventsSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  cursor: z.string().min(1).optional(),
  limit: z.number().min(1).max(200).optional(),
  types: z.array(
    z.enum([...ALLOWED_EVENTS] as [typeof ALLOWED_EVENTS[number], ...typeof ALLOWED_EVENTS[number][]])
  ).optional(),
  streamFormat: z.enum(["jsonl", "json"]).optional(),
  batchSize: z.number().min(1).max(100).optional()
});

toolRegistry["list_events"] = {
  name: "list_events",
  description:
    "Stream events that have occurred in the Exa Websets system. Supports filtering by event types and real-time streaming of events. Returns events in descending order by creation time.",
  enabled: true,
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    cursor: z.string().optional().describe("Cursor for pagination"),
    limit: z.number().optional().describe("Maximum total number of events to return"),
    types: z.array(
      z.enum([...ALLOWED_EVENTS] as [typeof ALLOWED_EVENTS[number], ...typeof ALLOWED_EVENTS[number][]])
    ).optional().describe("Event types to filter by"),
    streamFormat: z.enum(["jsonl", "json"]).optional().describe("Format for streaming: 'jsonl' (default) for line-delimited JSON or 'json' for a complete JSON array"),
    batchSize: z.number().min(1).max(100).optional().describe("Number of events to process in each batch (1-100, default: 25)")
  },
  handler: async (args, extra) => {
    const { apiKey, cursor, limit, types, streamFormat = "jsonl", batchSize = 25 } = args;
    const requestId = `list_events-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 7)}`;
    const logger = createRequestLogger(requestId, "list_events");
    const server = extra?.server;

    logger.start("Streaming events");

    // Validate input
    const parseResult = listEventsSchema.safeParse({
      apiKey,
      cursor,
      limit,
      types,
      streamFormat,
      batchSize
    });
    
    if (!parseResult.success) {
      logger.error("Validation failed");
      return {
        content: [
          {
            type: "text" as const,
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

    // Check if we're in a streaming-compatible environment
    const supportsStreaming = !!server?.streamResponse;
    
    // If streaming is not supported, fall back to traditional request
    if (!supportsStreaming) {
      logger.log("Streaming not supported, falling back to traditional request");
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
        if (batchSize) params.limit = batchSize;
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
              type: "text" as const,
              text: JSON.stringify(response.data, null, 2)
            }
          ]
        };
      } catch (error) {
        logger.error(error);
        return handleError(error, logger);
      }
    }

    // If we're here, streaming is supported
    logger.log("Using HTTP streaming for events retrieval");

    // Create a readable stream to push events through
    const eventStream = new Readable({
      objectMode: true,
      read() {} // No-op since we'll push manually
    });

    // Set up the stream response with the appropriate content type
    const contentType = streamFormat === "jsonl" ? "application/x-ndjson" : "application/json";
    server.streamResponse({
      contentType,
      stream: eventStream
    });

    // Handle initialization for JSON array format
    if (streamFormat === "json") {
      eventStream.push("[");
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

      let currentCursor = cursor;
      let totalRetrieved = 0;
      let hasMore = true;
      let isFirstEvent = true;

      // Fetch and stream events in batches
      while (hasMore && (!limit || totalRetrieved < limit)) {
        // Build query parameters for this batch
        const params: Record<string, string | number | string[]> = { 
          limit: batchSize 
        };
        if (currentCursor) params.cursor = currentCursor;
        if (types && types.length > 0) params.types = types;

        logger.log(`Fetching batch of events${currentCursor ? ' with cursor' : ''}`);
        
        const response = await axiosInstance.get<ExaEventListResponse>(
          API_CONFIG.ENDPOINTS.WEBSETS.EVENTS,
          { params }
        );
        
        const events = response.data.data || [];
        hasMore = !!response.data.nextCursor;
        currentCursor = response.data.nextCursor;
        
        // Stream each event
        for (const event of events) {
          if (limit && totalRetrieved >= limit) {
            break;
          }

          if (streamFormat === "jsonl") {
            // For JSONL format, send each event as a complete JSON object on a new line
            eventStream.push(JSON.stringify(event) + "\n");
          } else {
            // For JSON array format, format with commas between events
            if (!isFirstEvent) {
              eventStream.push(",");
            }
            eventStream.push(JSON.stringify(event, null, 2));
            isFirstEvent = false;
          }
          
          totalRetrieved++;
        }

        // Break if we've hit our limit or there are no more events
        if (limit && totalRetrieved >= limit) {
          logger.log(`Reached requested limit of ${limit} events`);
          break;
        }
        
        if (!hasMore) {
          logger.log("No more events available");
          break;
        }
      }

      // Close the JSON array if using that format
      if (streamFormat === "json") {
        eventStream.push("]");
      }

      // End the stream
      eventStream.push(null);
      logger.log(`Successfully streamed ${totalRetrieved} events`);

      // Return empty content since we're streaming the response
      return { content: [] };
    } catch (error) {
      logger.error(error);
      
      // Handle errors by pushing error information to the stream and ending it
      try {
        const isFirstEvent = true; // Reset for error case
        if (streamFormat === "jsonl") {
          eventStream.push(JSON.stringify({ error: formatErrorMessage(error) }) + "\n");
        } else {
          // For JSON array format, ensure valid JSON even in error cases
          if (!isFirstEvent) {
            eventStream.push(",");
          }
          eventStream.push(JSON.stringify({ error: formatErrorMessage(error) }, null, 2));
          eventStream.push("]");
        }
        eventStream.push(null);
      } catch (streamError) {
        logger.error(`Error while handling stream error: ${streamError}`);
      }
      
      // Return empty content since we're streaming the response, including errors
      return { content: [] };
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
