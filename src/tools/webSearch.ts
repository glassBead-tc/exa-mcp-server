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

// Register the web search tool
toolRegistry["web_search"] = {
  name: "web_search",
  description: "Search the web using Exa AI - performs real-time web searches and can scrape content from specific URLs. Supports configurable result counts and returns the content from the most relevant websites.",
  schema: {
    query: z.string().describe("Search query"),
    numResults: z.number().optional().describe("Number of search results to return (default: 5)"),
    streamFormat: z.enum(["json", "jsonl"]).optional().describe("If provided, returns a stream in the specified format instead of a single response object"),
    batchSize: z.number().optional().describe("When streaming, the number of results to include in each batch (default: 1)")
  },
  handler: async ({ query, numResults, streamFormat, batchSize = 1 }, extra) => {
    const requestId = `web_search-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, 'web_search');
    
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
        type: "auto",
        numResults: numResults || API_CONFIG.DEFAULT_NUM_RESULTS,
        contents: {
          text: {
            maxCharacters: API_CONFIG.DEFAULT_MAX_CHARACTERS
          },
          livecrawl: 'always'
        }
      };
      
      logger.log("Sending request to Exa API");
      
      const response = await axiosInstance.post<ExaSearchResponse>(
        API_CONFIG.ENDPOINTS.SEARCH,
        searchRequest,
        { timeout: 25000 }
      );
      
      logger.log("Received response from Exa API");

      if (!response.data || !response.data.results) {
        logger.log("Warning: Empty or invalid response from Exa API");
        
        if (isStreaming) {
          logger.log("Returning empty stream");
          return extra.capabilities.streamResponse(
            createErrorStream("No search results found. Please try a different query.")
          );
        }
        
        return {
          content: [{
            type: "text" as const,
            text: "No search results found. Please try a different query."
          }]
        };
      }

      const results = response.data.results;
      logger.log(`Found ${results.length} results`);
      
      // Handle streaming response
      if (isStreaming) {
        logger.log(`Streaming ${results.length} results in ${streamFormat} format`);
        
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
          ? `Search error (${error.response?.status || 'unknown'}): ${error.response?.data?.message || error.message}`
          : `Search error: ${error instanceof Error ? error.message : String(error)}`;
          
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
            text: `Search error (${statusCode}): ${errorMessage}`
          }],
          isError: true,
        };
      }
      
      // Handle generic errors
      return {
        content: [{
          type: "text" as const,
          text: `Search error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true,
      };
    }
  },
  enabled: true  // Enabled by default
}; 