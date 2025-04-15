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
import { promptRegistry, Prompt } from "./prompts/registry.js";
// Ensure prompts are loaded
import "./prompts/index.js";
import { log } from "./utils/logger.js";

// Import our custom transports
import { StreamableHTTPServerTransport } from './transports/index.js';

// Export our custom transports
export * from './transports/index.js';

dotenv.config();

// Parse command line arguments to determine which tools to enable
const argv = yargs(hideBin(process.argv))
  .option('tools', {
    type: 'string',
    description: 'Comma-separated list of tools to enable (if not specified, all enabled-by-default tools are used)',
    default: ''
  })
  .option('prompts', {
    type: 'boolean',
    description: 'Enable prompt capabilities',
    default: true
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
  .option('list-prompts', {
    type: 'boolean',
    description: 'List all available prompts and exit',
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
const enablePrompts = argvObj['prompts'];
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

// List all available prompts if requested
if (argvObj['list-prompts']) {
  console.log("Available prompts:");
  
  let promptCount = 0;
  Object.entries(promptRegistry).forEach(([id, prompt]) => {
    const p = prompt as Prompt;
    log(`Checking prompt: ${id}, enabled=${p.enabled}`);
    if (p.enabled) {
      promptCount++;
      console.log(`- ${id}: ${p.name}`);
      console.log(`  Description: ${p.description}`);
      console.log(`  Arguments: ${p.arguments?.length || 0}`);
      console.log(`  Enabled: ${p.enabled ? 'Yes' : 'No'}`);
      console.log();
    }
  });
  
  if (promptCount === 0) {
    console.log("No enabled prompts found.");
    log("No enabled prompts found. Registry size: " + Object.keys(promptRegistry).length);
  }
  
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

  private setupPrompts() {
    if (!enablePrompts) return;

    // Since we have legacy prompt format, let's manually expose the prompt capabilities
    // Create a temporary server to handle the legacy prompt interface
    Object.entries(promptRegistry).forEach(([promptId, p]) => {
      const prompt = p as Prompt;
      if (!prompt.enabled) return;

      // Create the prompt registration with just name and description
      this.server.prompt(
        prompt.name,
        prompt.description,
        async (args: any) => {
          try {
            const messages = await Promise.resolve(prompt.getMessages(args || {}));
            return {
              messages: messages.map(msg => ({
                role: msg.role,
                content: typeof msg.content === 'string' 
                  ? { type: "text", text: msg.content } 
                  : msg.content
              }))
            };
          } catch (error) {
            console.error(`Error in prompt ${prompt.name}:`, error);
            throw error;
          }
        }
      );
    });

    log(`Prompts capability ${enablePrompts ? 'enabled' : 'disabled'}`);
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
              // Log the received body for now
              // TODO: Implement actual processing logic for the webhook payload
              log(`Received Exa webhook notification: ${body}`);
              // Optionally parse if known to be JSON, but log raw for now
              // const parsedBody = JSON.parse(body);
              // log(`Parsed Exa webhook notification: ${JSON.stringify(parsedBody, null, 2)}`);
            } catch (error) {
              log(`Error processing Exa webhook body: ${error instanceof Error ? error.message : String(error)}`);
              log(`Raw body received: ${body}`); // Log raw body on error
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
      // Set up tools and prompts before connecting
      const registeredTools = this.setupTools();
      this.setupPrompts();
      
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