import { Exa, type Webset, type CreateWebsetParameters, type CreateEnrichmentParameters, type CreateWebhookParameters, type Webhook, type ListWebhooksOptions, type ListWebhooksResponse } from 'exa-js'; // Added correct Webhook types
import { log } from './logger.js'; // Assuming logger is in the same directory

// Define possible expand values based on Exa documentation/usage
type ExaExpandValues = 'items' | 'enrichments' | 'searches'; // Add other valid values as needed

/**
 * A client wrapper for interacting with the Exa Websets API using exa-js SDK.
 * Provides logging with a request ID for better traceability.
 */
export class ExaWebsetsClient {
  private exa: Exa; // Use the named import 'Exa' as the type
  private requestId: string;

  /**
   * Initializes the ExaWebsetsClient.
   * @param apiKey - The Exa API key.
   * @param requestId - A unique identifier for the request/operation context.
   */
  constructor(apiKey: string, requestId: string) {
    this.exa = new Exa(apiKey); // Instantiate using the named import 'Exa' class
    this.requestId = requestId;
    log(`[${this.requestId}] ExaWebsetsClient initialized`);
  }

  /**
   * Creates a new Webset.
   * @param params - Parameters for creating the Webset.
   * @returns The created Webset object.
   */
  async createWebset(params: CreateWebsetParameters): Promise<Webset> { // Correct type
    const query = params.search.query;
    log(`[${this.requestId}] Creating Webset with query: ${query}`);
    try {
      const webset = await this.exa.websets.create(params);
      log(`[${this.requestId}] Webset created with ID: ${webset.id}`);
      return webset;
    } catch (error: any) {
      log(`[${this.requestId}] ERROR: Error creating Webset: ${error.message}`); // Remove second arg
      throw error;
    }
  }

  /**
   * Retrieves a specific Webset by its ID.
   * @param websetId - The ID of the Webset to retrieve.
   * @param expand - Optional array to expand related entities (e.g., ['items']).
   * @returns The retrieved Webset object.
   */
  async getWebset(websetId: string, expand?: Array<ExaExpandValues>): Promise<Webset> { // Correct type for expand
    const expandLog = expand ? ` (expand: ${expand.join(', ')})` : '';
    log(`[${this.requestId}] Getting Webset with ID: ${websetId}${expandLog}`);
    try {
      // Type assertion needed because the SDK's get method might not have the exact overload
      const webset = await this.exa.websets.get(websetId, expand as any);
      // Determine search status for logging
      let searchStatus = 'no_searches';
      if (webset.searches && webset.searches.length > 0) { // Corrected logical AND
        // Assuming the last search is the most relevant status
        searchStatus = webset.searches[webset.searches.length - 1].status;
      }
      const itemCount = webset.items ? webset.items.length : 0; // Handle case where items might not be expanded
      log(`[${this.requestId}] Retrieved Webset: ${websetId} (status: ${webset.status}, search status: ${searchStatus}, items: ${itemCount})`);
      return webset;
    } catch (error: any) {
      log(`[${this.requestId}] ERROR: Error getting Webset ${websetId}: ${error.message}`); // Remove second arg
      throw error;
    }
  }


  /**
   * Creates a new Enrichment for a Webset.
   * @param websetId - The ID of the Webset.
   * @param params - Parameters for creating the Enrichment.
   * @returns The created Enrichment object (using any for now).
   */
  async createEnrichment(websetId: string, params: CreateEnrichmentParameters): Promise<any> { // Changed return type to any
    log(`[${this.requestId}] Creating Enrichment for Webset ${websetId} with format: ${params.format}`);
    try {
      const enrichment = await this.exa.websets.enrichments.create(websetId, params);
      log(`[${this.requestId}] Enrichment created with ID: ${enrichment.id}`);
      return enrichment;
    } catch (error: any) {
      log(`[${this.requestId}] ERROR: Error creating Enrichment for Webset ${websetId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Lists Enrichments for a Webset by retrieving the Webset with enrichments expanded.
   * @param websetId - The ID of the Webset.
   * @returns The Webset object containing enrichments.
   */
  async listEnrichments(websetId: string): Promise<Webset> { // Changed return type to Webset
    log(`[${this.requestId}] Listing Enrichments for Webset ${websetId} via get with expand`);
    try {
      // Use getWebset method with expand option
      const webset = await this.getWebset(websetId, ['enrichments']);
      const enrichmentCount = webset.enrichments ? webset.enrichments.length : 0;
      log(`[${this.requestId}] Retrieved ${enrichmentCount} Enrichments for Webset ${websetId}`);
      return webset; // Return the whole webset object
    } catch (error: any) {
      log(`[${this.requestId}] ERROR: Error listing Enrichments for Webset ${websetId} via get: ${error.message}`);
      throw error;
    }
  }

  /**
   * Lists Items for a Webset with optional pagination.
   * @param websetId - The ID of the Webset.
   * @param options - Optional parameters like limit and cursor.
   * @returns The list response containing items (using any for now).
   */
  async listItems(websetId: string, options?: { limit?: number; cursor?: string }): Promise<any> { // Changed return type to any
    log(`[${this.requestId}] Listing Items for Webset ${websetId} with options: ${JSON.stringify(options)}`);
    try {
      const response = await this.exa.websets.items.list(websetId, options);
      log(`[${this.requestId}] Retrieved ${response.data.length} Items for Webset ${websetId}`);
      return response;
    } catch (error: any) {
      log(`[${this.requestId}] ERROR: Error listing Items for Webset ${websetId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retrieves a specific Item from a Webset.
   * @param websetId - The ID of the Webset.
   * @param itemId - The ID of the Item.
   * @returns The retrieved Item object (using any for now).
   */
  async getItem(websetId: string, itemId: string): Promise<any> { // Changed return type to any
    log(`[${this.requestId}] Getting Item ${itemId} from Webset ${websetId}`);
    try {
      const item = await this.exa.websets.items.get(websetId, itemId);
      log(`[${this.requestId}] Retrieved Item ${itemId}`);
      return item;
    } catch (error: any) {
      log(`[${this.requestId}] ERROR: Error getting Item ${itemId} from Webset ${websetId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Deletes a specific Item from a Webset.
   * @param websetId - The ID of the Webset.
   * @param itemId - The ID of the Item.
   * @returns The delete response (using any for now).
   */
  async deleteItem(websetId: string, itemId: string): Promise<any> { // Changed return type to any
    log(`[${this.requestId}] Deleting Item ${itemId} from Webset ${websetId}`);
    try {
      const response = await this.exa.websets.items.delete(websetId, itemId);
      log(`[${this.requestId}] Deleted Item ${itemId}`);
      return response;
    } catch (error: any) {
      log(`[${this.requestId}] ERROR: Error deleting Item ${itemId} from Webset ${websetId}: ${error.message}`);
      throw error;
    }
  }


  /**
   * Creates a new Webhook.
   * @param params - Parameters for creating the Webhook.
   * @returns The created Webhook object.
   */
  async createWebhook(params: CreateWebhookParameters): Promise<Webhook> {
    log(`[${this.requestId}] Creating Webhook for URL: ${params.url}`);
    try {
      // Use this.exa.websets.webhooks.create based on SDK structure
      const webhook = await this.exa.websets.webhooks.create(params);
      log(`[${this.requestId}] Webhook created with ID: ${webhook.id}`);
      return webhook;
    } catch (error: any) {
      log(`[${this.requestId}] ERROR: Error creating Webhook: ${error.message}`);
      throw error;
    }
  }

  /**
   * Lists Webhooks with optional pagination.
   * @param options - Optional parameters like limit and cursor.
   * @returns The list response containing webhooks.
   */
  async listWebhooks(options?: ListWebhooksOptions): Promise<ListWebhooksResponse> {
    log(`[${this.requestId}] Listing Webhooks with options: ${JSON.stringify(options)}`);
    try {
      // Use this.exa.websets.webhooks.list based on SDK structure
      const response = await this.exa.websets.webhooks.list(options);
      log(`[${this.requestId}] Retrieved ${response.data.length} Webhooks`);
      return response;
    } catch (error: any) {
      log(`[${this.requestId}] ERROR: Error listing Webhooks: ${error.message}`);
      throw error;
    }
  }

  // --- Placeholder for future methods ---

  // async listWebsets(...) { ... }
  // async getAllWebsets(...) { ... }
  // async updateWebset(...) { ... }
  // async deleteWebset(...) { ... }
  // async cancelWebset(...) { ... }
  // async waitUntilIdle(...) { ... }
  // async listItems(...) { ... }
  // async getAllItems(...) { ... }
  // async getItem(...) { ... }
  // async deleteItem(...) { ... }
  // async createEnrichment(...) { ... }
  // async listEnrichments(...) { ... } // Note: Needs custom implementation based on get
  // async createWebhook(...) { ... }
  // async listWebhooks(...) { ... }
  // async listEvents(...) { ... }
  // async getEvent(...) { ... }
}
