/**
 * Enhanced Webset Enrichments tools using the exa-js SDK
 */
import { z } from "zod";
import { toolRegistry } from "../config.js";
import { createRequestLogger } from "../../utils/logger.js";
import { createExaWebsetsClient } from "../../utils/exaWebsetsClient.js";
import { CreateEnrichmentParametersFormat } from "exa-js";

/**
 * Create a new enrichment for a Webset
 */
toolRegistry["create_webset_enrichment"] = {
  name: "create_webset_enrichment",
  description: "Create a new enrichment for a Webset using the exa-js SDK.",
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    websetId: z.string().describe("The ID of the Webset to add the enrichment to"),
    description: z.string().describe("Description of the enrichment task"),
    format: z.enum(["text", "date", "number", "options", "email", "phone"]).describe("Format of the enrichment response"),
    options: z.array(
      z.object({
        label: z.string().describe("Label for the option")
      })
    ).optional().describe("Options for the enrichment (required when format is 'options')"),
    metadata: z.record(z.string()).optional().describe("Metadata for the enrichment")
  },
  handler: async ({ apiKey, websetId, description, format, options, metadata }) => {
    const requestId = `create_webset_enrichment-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, 'create_webset_enrichment');

    logger.start(`Creating enrichment for Webset ${websetId}`);

    try {
      // Validate options are provided when format is 'options'
      if (format === 'options' && (!options || options.length === 0)) {
        return {
          content: [{
            type: "text",
            text: "Error: When format is 'options', you must provide at least one option with a label."
          }],
          isError: true
        };
      }

      // Create Exa client with the API key
      const exaClient = createExaWebsetsClient(apiKey, requestId);
      
      // Create the enrichment
      const enrichment = await exaClient.createEnrichment(websetId, {
        description,
        format: format as CreateEnrichmentParametersFormat,
        options,
        metadata
      });
      
      // Prepare a user-friendly response
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            enrichment: {
              id: enrichment.id,
              description: enrichment.description,
              format: enrichment.format,
              status: enrichment.status,
              websetId: enrichment.websetId,
              createdAt: enrichment.createdAt
            },
            message: `Successfully created ${format} enrichment for Webset ${websetId}`,
            nextSteps: [
              "The enrichment will be applied to all items in the Webset.",
              "You can check the status of the enrichment by retrieving the Webset."
            ]
          }, null, 2)
        }]
      };
    } catch (error) {
      logger.error(error);
      
      return {
        content: [{
          type: "text",
          text: `Error creating Webset enrichment: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  },
  enabled: true
};

/**
 * List all enrichments for a Webset
 */
toolRegistry["list_webset_enrichments"] = {
  name: "list_webset_enrichments",
  description: "List all enrichments for a Webset using the exa-js SDK.",
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    websetId: z.string().describe("The ID of the Webset to list enrichments for")
  },
  handler: async ({ apiKey, websetId }) => {
    const requestId = `list_webset_enrichments-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, 'list_webset_enrichments');

    logger.start(`Listing enrichments for Webset ${websetId}`);

    try {
      // Create Exa client with the API key
      const exaClient = createExaWebsetsClient(apiKey, requestId);
      
      // List the enrichments
      const response = await exaClient.listEnrichments(websetId);
      
      // Format the enrichments
      const formattedEnrichments = response.data.map(enrichment => ({
        id: enrichment.id,
        description: enrichment.description,
        format: enrichment.format,
        status: enrichment.status,
        options: enrichment.options,
        createdAt: enrichment.createdAt,
        updatedAt: enrichment.updatedAt
      }));
      
      // Prepare a user-friendly response
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            enrichments: formattedEnrichments,
            totalEnrichments: formattedEnrichments.length,
            message: `Retrieved ${formattedEnrichments.length} enrichments for Webset ${websetId}`
          }, null, 2)
        }]
      };
    } catch (error) {
      logger.error(error);
      
      return {
        content: [{
          type: "text",
          text: `Error listing Webset enrichments: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  },
  enabled: true
};
