import { promptRegistry } from "../registry.js";

// Prompt for list_events tool
promptRegistry["list-events"] = {
  name: "list-events",
  description: "Stream events that have occurred in the Exa Websets system",
  arguments: [
    {
      name: "apiKey",
      description: "Your Exa API key",
      required: true
    },
    {
      name: "cursor",
      description: "Cursor for pagination",
      required: false
    },
    {
      name: "limit",
      description: "Maximum total number of events to return",
      required: false
    },
    {
      name: "types",
      description: "Event types to filter by",
      required: false
    },
    {
      name: "streamFormat",
      description: "Format for streaming: 'jsonl' (default) for line-delimited JSON or 'json' for a complete JSON array",
      required: false
    },
    {
      name: "batchSize",
      description: "Number of events to process in each batch (1-100, default: 25)",
      required: false
    }
  ],
  enabled: true,
  getMessages: (args) => {
    const { apiKey, cursor, limit, types, streamFormat, batchSize } = args || {};
    
    // Build the arguments object with only provided parameters
    let argumentsObj: any = {
      apiKey
    };
    
    if (cursor) argumentsObj.cursor = cursor;
    if (limit) argumentsObj.limit = limit;
    if (types) argumentsObj.types = types;
    if (streamFormat) argumentsObj.streamFormat = streamFormat;
    if (batchSize) argumentsObj.batchSize = batchSize;
    
    return [
      {
        role: "user",
        content: {
          type: "text",
          text: `Use the list_events tool with this format:
          
\`\`\`json
{
  "name": "list_events",
  "arguments": ${JSON.stringify(argumentsObj, null, 2)}
}
\`\`\`

This will stream events that have occurred in the Exa Websets system, with optional filtering by event types and pagination.`
        }
      }
    ];
  }
};

// Prompt for get_event tool
promptRegistry["get-event"] = {
  name: "get-event",
  description: "Get a single event by ID from Exa Websets",
  arguments: [
    {
      name: "apiKey",
      description: "Your Exa API key",
      required: true
    },
    {
      name: "id",
      description: "The ID of the event to retrieve",
      required: true
    }
  ],
  enabled: true,
  getMessages: (args) => {
    const { apiKey, id } = args || {};
    
    return [
      {
        role: "user",
        content: {
          type: "text",
          text: `Use the get_event tool with this format:
          
\`\`\`json
{
  "name": "get_event",
  "arguments": {
    "apiKey": "${apiKey}",
    "id": "${id}"
  }
}
\`\`\`

This will retrieve details about the specified event by ID.`
        }
      }
    ];
  }
}; 