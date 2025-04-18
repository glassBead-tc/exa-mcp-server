#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import http from 'node:http';
import { randomUUID } from 'node:crypto';

// Import the tool registry system
import { toolRegistry } from "./tools/index.js";
import { log } from "./utils/logger.js";

// Import our custom transports
import { StreamableHTTPServerTransport } from './transports/index.js';
import { websetJobManager } from './middleware/websetJobManager.js'; // Import the job manager
import { webhookHandler } from './middleware/webhookHandler.js'; // Import the webhook handler

// Export our custom transports and middleware
export * from './transports/index.js';
export { websetJobManager } from './middleware/websetJobManager.js';
export { webhookHandler } from './middleware/webhookHandler.js';

dotenv.config();

// Parse command line arguments to determine which tools to enable
const argv = yargs(hideBin(process.argv))
  .option('tools', {
    type: 'string',
    description: 'Comma-separated list of tools to enable (if not specified, all enabled-by-default tools are used)',
    default: ''
  })
  .option('transport', {
    type: 'string',
    description: 'Transport type: stdio or http',
    choices: ['stdio', 'http'],
    default: 'stdio'
  })
  .option('port', {
    type: 'number',
    description: 'HTTP port (when using http transport)',
    default: 3000
  })
  .option('stateless', {
    type: 'boolean',
    description: 'Run HTTP server in stateless mode (no session tracking)',
    default: false
  })
  .option('list-tools', {
    type: 'boolean',
    description: 'List all available tools and exit',
    default: false
  })
  .help()
  .argv;

// Convert command line arguments
const argvObj = argv as any;
const toolsString = argvObj['tools'] || '';
const specifiedTools = new Set<string>(
  toolsString ? toolsString.split(',').map((tool: string) => tool.trim()) : []
);
const transportType = argvObj['transport'];
const httpPort = argvObj['port'];
const statelessMode = argvObj['stateless'];

// List all available tools if requested
if (argvObj['list-tools']) {
  console.log("Available tools:");

  Object.entries(toolRegistry).forEach(([id, tool]) => {
    console.log(`- ${id}: ${tool.name}`);
    console.log(`  Description: ${tool.description}`);
    console.log(`  Enabled by default: ${tool.enabled ? 'Yes' : 'No'}`);
    console.log();
  });

  process.exit(0);
}

// Check for API key after handling list-tools to allow listing without a key
const API_KEY = process.env.EXA_API_KEY;
if (!API_KEY) {
  throw new Error("EXA_API_KEY environment variable is required");
}

/**
 * Exa AI Web Search MCP Server
 *
 * This MCP server integrates Exa AI's search capabilities with Claude and other MCP-compatible clients.
 * Exa is a search engine and API specifically designed for up-to-date web searching and retrieval,
 * offering more recent and comprehensive results than what might be available in an LLM's training data.
 *
 * The server provides tools that enable:
 * - Real-time web searching with configurable parameters
 * - Research paper searches
 * - Twitter searches
 * - Manage Websets through Claude
 * - And more to come!
 */

class ExaServer {
  private server: McpServer;

  constructor() {
    this.server = new McpServer({
      name: "exa-search-server",
      version: "0.3.4"
    });

    log("Server initialized");
  }

  private setupTools(): string[] {
    // Register tools based on specifications
    const registeredTools: string[] = [];

    Object.entries(toolRegistry).forEach(([toolId, tool]) => {
      // If specific tools were provided, only enable those.
      // Otherwise, enable all tools marked as enabled by default
      const shouldRegister = specifiedTools.size > 0
        ? specifiedTools.has(toolId)
        : tool.enabled;

      if (shouldRegister) {
        this.server.tool(
          tool.name,
          tool.description,
          tool.schema,
          tool.handler
        );
        registeredTools.push(toolId);
      }
    });

    return registeredTools;
  }

  private setupHttpServer(transport: StreamableHTTPServerTransport): http.Server {
    const httpServer = http.createServer(async (req, res) => {
      // Handle requests through the StreamableHTTPServerTransport
      if (!req.url) {
        res.writeHead(400).end('Missing URL');
        return;
      }

      // Only handle requests to /mcp endpoint
      if (req.url === '/mcp') {
        try {
          await transport.handleRequest(req, res);
        } catch (error) {
          log(`Error handling request: ${error instanceof Error ? error.message : String(error)}`);
          if (!res.headersSent) {
            res.writeHead(500).end('Internal Server Error');
          }
        }
      } else {
        // Simple status endpoint
        if (req.url === '/status') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'ok',
            name: 'exa-mcp-server',
            version: '0.3.4',
            transport: 'http'
          }));
          return;
        }
        // Handle Exa Webhook POST requests
        else if (req.method === 'POST' && req.url === '/webhooks/exa') {
          // Acknowledge receipt immediately as per webhook best practices
          res.writeHead(200).end();

          let body = '';
          req.on('data', chunk => {
            body += chunk.toString(); // Convert Buffer to string
          });
          req.on('end', () => {
            try {
              // Attempt to parse the JSON body
              const payload = JSON.parse(body);
              log(`Received Exa webhook payload: ${JSON.stringify(payload, null, 2)}`); // Use JSON.stringify

              // Extract and log key information (adjust keys based on actual Exa payload structure)
              const eventType = payload.type || payload.event; // Example keys
              const websetId = payload.data?.id || payload.websetId; // Example keys
              const status = payload.data?.status || payload.status; // Example keys

              log(`Webhook Event Type: ${eventType || 'N/A'}`);
              log(`Webset ID: ${websetId || 'N/A'}`);
              log(`Status: ${status || 'N/A'}`);

              // Use the dedicated webhook handler to process the update
              log(`Calling webhookHandler.processWebhook for websetId: ${websetId}`);
              webhookHandler.processWebhook(payload)
                .then(() => {
                  log(`Successfully processed webhook for websetId: ${websetId}`);
                })
                .catch(handlerError => {
                  log(`Error processing webhook for websetId ${websetId}: ${handlerError instanceof Error ? handlerError.message : String(handlerError)}`);
                });
            } catch (error) {
              log(`Error parsing Exa webhook body: ${error instanceof Error ? error.message : String(error)}`);
              log(`Raw body received: ${body}`);
            }
          });
          req.on('error', (error) => {
            log(`Error reading Exa webhook request stream: ${error.message}`);
          });
          return; // Return after setting up listeners and sending initial response
        }

        res.writeHead(404).end('Not Found');
      }
    });

    return httpServer;
  }

  async run(): Promise<void> {
    try {
      // Set up tools before connecting
      const registeredTools = this.setupTools();

      log(`Starting Exa MCP server with ${registeredTools.length} tools: ${registeredTools.join(', ')}`);

      if (transportType === 'http') {
        // HTTP transport mode
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: statelessMode ? () => undefined : () => randomUUID(),
          enableJsonResponse: false // Use SSE streaming by default
        });

        // Set up error handler
        transport.onerror = (error) => {
          log(`Transport error: ${error.message}`);
        };

        // Create and start HTTP server
        const httpServer = this.setupHttpServer(transport);

        // Start the transport
        await transport.start();

        // Connect the server to the transport
        await this.server.connect(transport);

        // Start listening on the specified port
        httpServer.listen(httpPort, () => {
          log(`Exa Search MCP server running on HTTP at http://localhost:${httpPort}/mcp`);
          log(`Using ${statelessMode ? 'stateless' : 'stateful'} mode`);
        });
      } else {
        // Default stdio transport mode
        const transport = new StdioServerTransport();

        // Handle connection errors
        transport.onerror = (error) => {
          log(`Transport error: ${error.message}`);
        };

        await this.server.connect(transport);
        log("Exa Search MCP server running on stdio");
      }
    } catch (error) {
      log(`Server initialization error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}

// Create and run the server with proper error handling
(async () => {
  try {
    const server = new ExaServer();
    await server.run();
  } catch (error) {
    log(`Fatal server error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
})();