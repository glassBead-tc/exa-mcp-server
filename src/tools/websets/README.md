# Exa Websets MCP Tools

This directory contains MCP tools for interacting with Exa's Websets API. Websets are collections of web pages that can be searched, enriched, and analyzed.

## Overview

The Websets tools provide a comprehensive interface to Exa's Websets API, allowing you to:

- Create and manage Websets
- Search within Websets
- Add and manage enrichments
- Handle webhooks for asynchronous updates
- Track and monitor events

## Tool Categories

### Core Webset Management

- `create_webset` - Create a new Webset with search parameters
- `get_webset_status` - Check the status of a Webset creation process
- `update_webset` - Update a Webset's metadata
- `list_websets` - List all Websets
- `cancel_webset` - Cancel a running Webset
- `delete_webset` - Delete a Webset

### Asynchronous Job Management

- `create_webset_async` - Create a Webset asynchronously with job tracking
- `get_webset_job_status` - Check the status of an asynchronous Webset job

### Items Management

- `get_webset_items_enhanced` - Get all items from a Webset with advanced filtering
- `get_webset_item` - Get a specific item from a Webset
- `delete_webset_item` - Delete a specific item from a Webset

### Enrichments

- `create_enrichment` - Create an enrichment for a Webset
- `list_enrichments` - List all enrichments for a Webset
- `cancel_enrichment` - Cancel an enrichment

### Webhooks

- `create_webhook` - Create a webhook for Webset events
- `list_webhooks` - List all webhooks
- `delete_webhook` - Delete a webhook

### Events

- `list_events` - List all events
- `get_event` - Get a specific event

## Implementation Details

### Architecture

The Websets tools are implemented using a layered architecture:

1. **Tool Layer** - MCP tools that handle requests from clients
2. **Client Layer** - A wrapper around the Exa JS SDK
3. **Job Management Layer** - Handles asynchronous job tracking
4. **Webhook Layer** - Processes webhook events from Exa

### Key Components

- `exaWebsetsClient.ts` - A wrapper around the Exa JS SDK
- `websetJobManager.ts` - Manages asynchronous Webset creation jobs
- `webhookHandler.ts` - Handles webhook events from Exa

### Enhanced vs. Standard Tools

Some tools have both standard and enhanced versions:

- Standard tools use direct API calls via Axios
- Enhanced tools use the Exa JS SDK for more robust functionality

## Usage Examples

### Creating a Webset

```javascript
// Example: Create a Webset
{
  "apiKey": "your-exa-api-key",
  "search": {
    "query": "AI companies in healthcare",
    "count": 20
  }
}
```

### Checking Webset Status

```javascript
// Example: Check Webset status
{
  "apiKey": "your-exa-api-key",
  "websetId": "webset_123456",
  "expand": "items"
}
```

### Creating an Enrichment

```javascript
// Example: Create an enrichment
{
  "apiKey": "your-exa-api-key",
  "websetId": "webset_123456",
  "description": "Extract company funding amount",
  "format": "number"
}
```

## Webhook Support

The server supports webhooks from Exa to receive real-time updates about Webset status changes. Webhooks are processed by the `webhookHandler` and used to update job status in the `websetJobManager`.

## Error Handling

All tools include comprehensive error handling with:

- Detailed error messages
- Appropriate HTTP status codes
- Logging for debugging

## Maintenance

The job manager includes automatic cleanup of old jobs to prevent memory leaks:

- Jobs older than 24 hours are automatically cleaned up
- Completed jobs can be preserved if needed
- Cleanup runs hourly by default

## Future Enhancements

Planned enhancements include:

- Better integration with the Exa JS SDK for all tools
- More advanced filtering and search capabilities
- Enhanced webhook validation and security
- Additional enrichment types and capabilities
