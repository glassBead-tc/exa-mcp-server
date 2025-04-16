/**
 * Webhook Handler for Exa Websets
 *
 * This class handles incoming webhooks from Exa's Websets API,
 * validates them, and routes them to the appropriate handlers.
 */

import { createRequestLogger } from '../utils/logger.js';
import { websetJobManager } from './websetJobManager.js';
import { ExaWebsetsResponse } from '../types.js';

const logger = createRequestLogger('WebhookHandler', 'middleware');

/**
 * Supported webhook event types from Exa
 */
export enum WebhookEventType {
  WEBSET_CREATED = 'webset.created',
  WEBSET_UPDATED = 'webset.updated',
  WEBSET_DELETED = 'webset.deleted',
  WEBSET_SEARCH_CREATED = 'webset.search.created',
  WEBSET_SEARCH_RUNNING = 'webset.search.running',
  WEBSET_SEARCH_COMPLETED = 'webset.search.completed',
  WEBSET_SEARCH_CANCELED = 'webset.search.canceled',
  WEBSET_ENRICHMENT_CREATED = 'webset.enrichment.created',
  WEBSET_ENRICHMENT_COMPLETED = 'webset.enrichment.completed',
  WEBSET_ENRICHMENT_CANCELED = 'webset.enrichment.canceled',
  UNKNOWN = 'unknown'
}

/**
 * Webhook payload structure
 */
export interface WebhookPayload {
  id: string;
  type: string;
  data: ExaWebsetsResponse;
  createdAt: string;
}

/**
 * Handler class for Exa webhooks
 */
export class WebhookHandler {
  /**
   * Process an incoming webhook payload
   * @param payload The raw webhook payload
   * @returns Promise that resolves when processing is complete
   */
  async processWebhook(payload: any): Promise<void> {
    logger.log('Processing incoming webhook');

    try {
      // Validate the payload
      const validatedPayload = this.validatePayload(payload);
      if (!validatedPayload) {
        logger.log('Invalid webhook payload received, skipping processing');
        return;
      }

      // Log the event type and webset ID
      const eventType = validatedPayload.type;
      const websetId = validatedPayload.data.id;
      logger.log(`Processing webhook event: ${eventType} for websetId: ${websetId}`);

      // Process based on event type
      await this.routeWebhook(validatedPayload);

      logger.log(`Successfully processed webhook event: ${eventType} for websetId: ${websetId}`);
    } catch (error) {
      logger.error(`Error processing webhook: ${error instanceof Error ? error.message : String(error)}`);
      throw error; // Re-throw to allow the caller to handle it
    }
  }

  /**
   * Validate the webhook payload structure
   * @param payload The raw webhook payload
   * @returns The validated payload or null if invalid
   */
  private validatePayload(payload: any): WebhookPayload | null {
    // Basic structure validation
    if (!payload || typeof payload !== 'object') {
      logger.log('Webhook payload is not an object');
      return null;
    }

    // Check required fields
    if (!payload.type || !payload.data || !payload.data.id) {
      logger.log('Webhook payload missing required fields (type, data.id)');
      return null;
    }

    // Validate event type
    const eventType = this.normalizeEventType(payload.type);
    if (eventType === WebhookEventType.UNKNOWN) {
      logger.log(`Unknown webhook event type: ${payload.type}`);
      // We still process unknown events, just log them
    }

    // Validate data structure (basic check)
    if (!payload.data.object || payload.data.object !== 'webset') {
      logger.log(`Invalid data object type: ${payload.data.object}`);
      return null;
    }

    return {
      id: payload.id || 'unknown',
      type: eventType,
      data: payload.data as ExaWebsetsResponse,
      createdAt: payload.createdAt || new Date().toISOString()
    };
  }

  /**
   * Normalize the event type to our enum
   * @param eventType The raw event type from the webhook
   * @returns The normalized event type
   */
  private normalizeEventType(eventType: string): WebhookEventType {
    switch (eventType) {
      case 'webset.created':
        return WebhookEventType.WEBSET_CREATED;
      case 'webset.updated':
        return WebhookEventType.WEBSET_UPDATED;
      case 'webset.deleted':
        return WebhookEventType.WEBSET_DELETED;
      case 'webset.search.created':
        return WebhookEventType.WEBSET_SEARCH_CREATED;
      case 'webset.search.running':
        return WebhookEventType.WEBSET_SEARCH_RUNNING;
      case 'webset.search.completed':
        return WebhookEventType.WEBSET_SEARCH_COMPLETED;
      case 'webset.search.canceled':
        return WebhookEventType.WEBSET_SEARCH_CANCELED;
      case 'webset.enrichment.created':
        return WebhookEventType.WEBSET_ENRICHMENT_CREATED;
      case 'webset.enrichment.completed':
        return WebhookEventType.WEBSET_ENRICHMENT_COMPLETED;
      case 'webset.enrichment.canceled':
        return WebhookEventType.WEBSET_ENRICHMENT_CANCELED;
      default:
        return WebhookEventType.UNKNOWN;
    }
  }

  /**
   * Route the webhook to the appropriate handler based on event type
   * @param payload The validated webhook payload
   */
  private async routeWebhook(payload: WebhookPayload): Promise<void> {
    const { type, data } = payload;

    // Log detailed information about the event
    this.logWebhookDetails(payload);

    // Handle based on event type
    switch (type) {
      case WebhookEventType.WEBSET_SEARCH_COMPLETED:
      case WebhookEventType.WEBSET_SEARCH_CANCELED:
        // These events affect job status, so update the job manager
        await websetJobManager.handleWebhookUpdate(payload);
        break;

      case WebhookEventType.WEBSET_SEARCH_CREATED:
      case WebhookEventType.WEBSET_SEARCH_RUNNING:
        // These are informational updates, still pass to job manager
        await websetJobManager.handleWebhookUpdate(payload);
        break;

      case WebhookEventType.WEBSET_ENRICHMENT_COMPLETED:
      case WebhookEventType.WEBSET_ENRICHMENT_CANCELED:
        // Enrichment events might also affect job status or provide updates
        logger.log(`Enrichment event: ${type} for webset ${data.id}`);
        await websetJobManager.handleWebhookUpdate(payload);
        break;

      default:
        // For other events (like webset.created, webset.updated, webset.deleted), just log them
        logger.log(`Received webhook event: ${type} for webset ${data.id}`);
        break;
    }
  }

  /**
   * Log detailed information about the webhook for debugging
   * @param payload The webhook payload
   */
  private logWebhookDetails(payload: WebhookPayload): void {
    const { type, data } = payload;

    // Log basic event info
    logger.log(`Webhook event details: ${type} for webset ${data.id}`);

    // Log search status if available
    if (data.searches && data.searches.length > 0) {
      const search = data.searches[0];
      logger.log(`Search status: ${search.status}, Progress: ${Math.round(search.progress.completion * 100)}%`);

      if (search.status === 'canceled') {
        logger.log(`Cancellation reason: ${search.canceledReason || 'Unknown'}`);
      }
    }

    // Log enrichment status if this is an enrichment event
    if (type.includes('enrichment') && data.enrichments && data.enrichments.length > 0) {
      const enrichmentStatuses = data.enrichments.map(e => `${e.id}: ${e.status}`).join(', ');
      logger.log(`Enrichment statuses: ${enrichmentStatuses}`);
    }
  }
}

// Export a singleton instance
export const webhookHandler = new WebhookHandler();
