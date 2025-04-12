import { z } from "zod";
import axios from "axios";
import { Readable } from "stream";
import { toolRegistry, API_CONFIG } from "./config.js";
import { ExaSearchRequest, ExaSearchResponse } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";

// Helper function for streaming errors
function createErrorStream(errorMessage: string): Readable {
  const stream = new Readable({
    read() {}
  });
  stream.push(JSON.stringify({
    isError: true,
    error: errorMessage
  }));
  stream.push(null);
  return stream;
}

// Register the Twitter search tool
toolRegistry["twitter_search"] = {
  name: "twitter_search",
  description: "Search Twitter/X.com posts and accounts using Exa AI - performs targeted searches of Twitter (X.com) content including tweets, profiles, and discussions. Returns relevant tweets, profile information, and conversation threads based on your query. You can search for a user by x.com/username or from:username",
  schema: {
    query: z.string().describe("Twitter username, hashtag, or search term (e.g., 'x.com/username' or search term)"),
    numResults: z.number().optional().describe("Number of Twitter results to return (default: 5)"),
    startPublishedDate: z.string().optional().describe("Optional ISO date string (e.g., '2023-04-01T00:00:00.000Z') to filter tweets published after this date. Use only when necessary."),
    endPublishedDate: z.string().optional().describe("Optional ISO date string (e.g., '2023-04-30T23:59:59.999Z') to filter tweets published before this date. Use only when necessary."),
    streamFormat: z.enum(["json", "jsonl"]).optional().describe("If provided, returns a stream in the specified format instead of a single response object"),
    batchSize: z.number().optional().describe("When streaming, the number of results to include in each batch (default: 1)")
  },
  handler: async ({ query, numResults, startPublishedDate, endPublishedDate, streamFormat, batchSize = 1 }, extra) => {
    const requestId = `twitter_search-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, 'twitter_search');
    
    logger.start(query);
    
    // Check if streaming is requested
    const isStreaming = Boolean(streamFormat);
    if (isStreaming && !extra.capabilities?.streamResponse) {
      logger.log("Streaming requested but not supported by client");
      return {
        content: [{
          type: "text" as const,
          text: "Streaming was requested but is not supported by the client. Please retry without streaming."
        }],
        isError: true
      };
    }
    
    try {
      // Create a fresh axios instance for each request
      const axiosInstance = axios.create({
        baseURL: API_CONFIG.BASE_URL,
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-api-key': process.env.EXA_API_KEY || ''
        },
        timeout: 25000
      });

      const searchRequest: ExaSearchRequest = {
        query,
        includeDomains: ["x.com", "twitter.com"],
        type: "auto",
        numResults: numResults || API_CONFIG.DEFAULT_NUM_RESULTS,
        contents: {
          text: {
            maxCharacters: API_CONFIG.DEFAULT_MAX_CHARACTERS
          },
          livecrawl: 'always'
        }
      };
      
      // Add date filters only if they're provided
      if (startPublishedDate) {
        searchRequest.startPublishedDate = startPublishedDate;
        logger.log(`Filtering tweets after: ${startPublishedDate}`);
      }
      
      if (endPublishedDate) {
        searchRequest.endPublishedDate = endPublishedDate;
        logger.log(`Filtering tweets before: ${endPublishedDate}`);
      }
      
      logger.log("Sending Twitter search request to Exa API");
      
      const response = await axiosInstance.post<ExaSearchResponse>(
        API_CONFIG.ENDPOINTS.SEARCH,
        searchRequest,
        { timeout: 25000 }
      );
      
      logger.log("Received Twitter search response from Exa API");

      if (!response.data || !response.data.results) {
        logger.log("Warning: Empty or invalid response from Exa API for Twitter search");
        
        if (isStreaming) {
          logger.log("Returning empty stream");
          return extra.capabilities.streamResponse(
            createErrorStream("No Twitter results found. Please try a different query.")
          );
        }
        
        return {
          content: [{
            type: "text" as const,
            text: "No Twitter results found. Please try a different query."
          }]
        };
      }

      const results = response.data.results;
      logger.log(`Found ${results.length} Twitter results`);
      
      // Handle streaming response
      if (isStreaming) {
        logger.log(`Streaming ${results.length} Twitter results in ${streamFormat} format`);
        
        const stream = new Readable({
          read() {}
        });
        
        const processResults = () => {
          if (results.length === 0) {
            stream.push(null);
            return;
          }
          
          const batch = results.splice(0, batchSize);
          
          if (streamFormat === "jsonl") {
            // For JSONL, stream each result as a separate line
            batch.forEach(result => {
              stream.push(JSON.stringify(result) + "\n");
            });
          } else {
            // For JSON, stream the batch as a JSON array
            stream.push(JSON.stringify(batch));
          }
          
          if (results.length > 0) {
            setTimeout(processResults, 0);
          } else {
            stream.push(null);
          }
        };
        
        // Start streaming
        processResults();
        logger.complete();
        return extra.capabilities.streamResponse(stream);
      }
      
      // Non-streaming response
      const result = {
        content: [{
          type: "text" as const,
          text: JSON.stringify(response.data, null, 2)
        }]
      };
      
      logger.complete();
      return result;
    } catch (error) {
      logger.error(error);
      
      if (isStreaming) {
        const errorMessage = axios.isAxiosError(error)
          ? `Twitter search error (${error.response?.status || 'unknown'}): ${error.response?.data?.message || error.message}`
          : `Twitter search error: ${error instanceof Error ? error.message : String(error)}`;
          
        return extra.capabilities.streamResponse(createErrorStream(errorMessage));
      }
      
      if (axios.isAxiosError(error)) {
        // Handle Axios errors specifically
        const statusCode = error.response?.status || 'unknown';
        const errorMessage = error.response?.data?.message || error.message;
        
        logger.log(`Axios error (${statusCode}): ${errorMessage}`);
        return {
          content: [{
            type: "text" as const,
            text: `Twitter search error (${statusCode}): ${errorMessage}`
          }],
          isError: true,
        };
      }
      
      // Handle generic errors
      return {
        content: [{
          type: "text" as const,
          text: `Twitter search error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true,
      };
    }
  },
  enabled: false  // Disabled by default
}; 