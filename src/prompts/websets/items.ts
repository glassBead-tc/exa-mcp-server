import { promptRegistry } from "../registry.js";

// Prompt for get_item tool
promptRegistry["get-item"] = {
  name: "get-item",
  description: "Retrieve a specific Item from a Webset by ID",
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
      description: "The Item ID to retrieve",
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
          text: `Use the get_item tool with this format:
          
\`\`\`json
{
  "name": "get_item",
  "arguments": {
    "apiKey": "${apiKey}",
    "webset": "${webset}",
    "id": "${id}"
  }
}
\`\`\`

This will retrieve details about the specified Item from the Webset.`
        }
      }
    ];
  }
};

// Prompt for delete_item tool
promptRegistry["delete-item"] = {
  name: "delete-item",
  description: "Delete an Item from a Webset",
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
      description: "The Item ID to delete",
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
          text: `Use the delete_item tool with this format:
          
\`\`\`json
{
  "name": "delete_item",
  "arguments": {
    "apiKey": "${apiKey}",
    "webset": "${webset}",
    "id": "${id}"
  }
}
\`\`\`

This will permanently delete the specified Item from the Webset.`
        }
      }
    ];
  }
};

// Prompt for list_items tool
promptRegistry["list-items"] = {
  name: "list-items",
  description: "List Items in a Webset with filtering options",
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
      description: "Maximum number of Items to return",
      required: false
    },
    {
      name: "cursor",
      description: "Pagination cursor for retrieving additional results",
      required: false
    },
    {
      name: "filters",
      description: "Filtering criteria for the Items",
      required: false
    }
  ],
  enabled: true,
  getMessages: (args) => {
    const { apiKey, webset, limit, cursor, filters } = args || {};
    
    // Build the arguments object with only provided parameters
    let argumentsObj: any = {
      apiKey,
      webset
    };
    
    if (limit) argumentsObj.limit = limit;
    if (cursor) argumentsObj.cursor = cursor;
    if (filters) argumentsObj.filters = filters;
    
    return [
      {
        role: "user",
        content: {
          type: "text",
          text: `Use the list_items tool with this format:
          
\`\`\`json
{
  "name": "list_items",
  "arguments": ${JSON.stringify(argumentsObj, null, 2)}
}
\`\`\`

This will retrieve a list of Items from the specified Webset, with optional filtering.`
        }
      }
    ];
  }
}; 