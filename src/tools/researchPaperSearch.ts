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

// Register the research paper search tool
toolRegistry["research_paper_search"] = {
  name: "research_paper_search",
  description: "Search across 100M+ research papers with full text access using Exa AI - performs targeted academic paper searches with deep research content coverage. Returns detailed information about relevant academic papers including titles, authors, publication dates, and full text excerpts. Control the number of results and character counts returned to balance comprehensiveness with conciseness based on your task requirements.",
  schema: {
    query: z.string().describe("Research topic or keyword to search for"),
    numResults: z.number().optional().describe("Number of research papers to return (default: 5)"),
    maxCharacters: z.number().optional().describe("Maximum number of characters to return for each result's text content (Default: 3000)"),
    streamFormat: z.enum(["json", "jsonl"]).optional().describe("If provided, returns a stream in the specified format instead of a single response object"),
    batchSize: z.number().optional().describe("When streaming, the number of results to include in each batch (default: 1)")
  },
  handler: async ({ query, numResults, maxCharacters, streamFormat, batchSize = 1 }, extra) => {
    const requestId = `research_paper-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, 'research_paper_search');
    
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
        category: "research paper",
        type: "auto",
        numResults: numResults || API_CONFIG.DEFAULT_NUM_RESULTS,
        contents: {
          text: {
            maxCharacters: maxCharacters || API_CONFIG.DEFAULT_MAX_CHARACTERS
          },
          livecrawl: 'fallback'
        }
      };
      
      logger.log("Sending research paper request to Exa API");
      
      const response = await axiosInstance.post<ExaSearchResponse>(
        API_CONFIG.ENDPOINTS.SEARCH,
        searchRequest,
        { timeout: 25000 }
      );
      
      logger.log("Received research paper response from Exa API");

      if (!response.data || !response.data.results) {
        logger.log("Warning: Empty or invalid response from Exa API for research papers");
        
        if (isStreaming) {
          logger.log("Returning empty stream");
          return extra.capabilities.streamResponse(
            createErrorStream("No research papers found. Please try a different query.")
          );
        }
        
        return {
          content: [{
            type: "text" as const,
            text: "No research papers found. Please try a different query."
          }]
        };
      }

      const results = response.data.results;
      logger.log(`Found ${results.length} research papers`);
      
      // Handle streaming response
      if (isStreaming) {
        logger.log(`Streaming ${results.length} research papers in ${streamFormat} format`);
        
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
          ? `Research paper search error (${error.response?.status || 'unknown'}): ${error.response?.data?.message || error.message}`
          : `Research paper search error: ${error instanceof Error ? error.message : String(error)}`;
          
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
            text: `Research paper search error (${statusCode}): ${errorMessage}`
          }],
          isError: true,
        };
      }
      
      // Handle generic errors
      return {
        content: [{
          type: "text" as const,
          text: `Research paper search error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true,
      };
    }
  },
  enabled: false  // Disabled by default
}; 