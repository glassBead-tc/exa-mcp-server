import { promptRegistry } from "../registry.js";

// Prompt for list_events tool
promptRegistry["list-events"] = {
  name: "list-events",
  description: "List Events for a Webset with filtering options",
  arguments: [
    {
      name: "apiKey",
      description: "Your Exa API key",
      required: true
    },
    {
      name: "webset",
      description: "The Webset ID",
      required: true
    },
    {
      name: "limit",
      description: "Maximum number of Events to return",
      required: false
    },
    {
      name: "cursor",
      description: "Pagination cursor for retrieving additional results",
      required: false
    },
    {
      name: "filters",
      description: "Filtering criteria for the Events",
      required: false
    },
    {
      name: "stream",
      description: "Enable streaming of results (true/false)",
      required: false
    }
  ],
  enabled: true,
  getMessages: (args) => {
    const { apiKey, webset, limit, cursor, filters, stream } = args || {};
    
    // Build the arguments object with only provided parameters
    let argumentsObj: any = {
      apiKey,
      webset
    };
    
    if (limit) argumentsObj.limit = limit;
    if (cursor) argumentsObj.cursor = cursor;
    if (filters) argumentsObj.filters = filters;
    if (stream !== undefined) argumentsObj.stream = stream;
    
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

This will retrieve a list of Events from the specified Webset, with optional filtering${stream ? ' and will stream results as they become available' : ''}.`
        }
      }
    ];
  }
};

// Prompt for get_event tool
promptRegistry["get-event"] = {
  name: "get-event",
  description: "Retrieve a specific Event from a Webset by ID",
  arguments: [
    {
      name: "apiKey",
      description: "Your Exa API key",
      required: true
    },
    {
      name: "webset",
      description: "The Webset ID",
      required: true
    },
    {
      name: "id",
      description: "The Event ID to retrieve",
      required: true
    }
  ],
  enabled: true,
  getMessages: (args) => {
    const { apiKey, webset, id } = args || {};
    
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
    "webset": "${webset}",
    "id": "${id}"
  }
}
\`\`\`

This will retrieve details about the specified Event from the Webset.`
        }
      }
    ];
  }
}; 