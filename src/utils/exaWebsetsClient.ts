import { Exa, type Webset, type CreateWebsetParameters } from 'exa-js'; // Use named import for class and types
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
