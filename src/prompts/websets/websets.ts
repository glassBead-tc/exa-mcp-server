import { promptRegistry } from "../registry.js";
import { z } from "zod";

// Prompt for create_webset tool
promptRegistry["create-webset"] = {
  name: "create-webset",
  description: "Create a new Webset with properly formatted parameters",
  arguments: [
    {
      name: "apiKey",
      description: "Your Exa API key (without trailing spaces)",
      required: true
    },
    {
      name: "query",
      description: "Search query for the Webset",
      required: true
    },
    {
      name: "count",
      description: "Number of results to attempt to find",
      required: true
    },
    {
      name: "externalId",
      description: "Simple string identifier for the Webset (not a JSON object)",
      required: false
    },
    {
      name: "enrichments",
      description: "Optional array of enrichment configuration objects",
      required: false
    }
  ],
  enabled: true,
  getMessages: (args) => {
    const { apiKey, query, count, externalId, enrichments } = args || {};
    
    return [
      {
        role: "user",
        content: {
          type: "text",
          text: `Use the create_webset tool with this format:
          
\`\`\`json
{
  "name": "create_webset",
  "arguments": {
    "apiKey": "${apiKey}",
    "search": {
      "count": ${count},
      "query": "${query}"
    }${externalId ? `,
    "externalId": "${externalId}"` : ''}${enrichments ? `,
    "enrichments": ${JSON.stringify(enrichments, null, 2)}` : ''}
  }
}
\`\`\`

This will create a new Webset using Exa's API to search for and organize web content based on your query.`
        }
      }
    ];
  }
};

// Prompt for get_webset tool
promptRegistry["get-webset"] = {
  name: "get-webset",
  description: "Retrieve an existing Webset by ID",
  arguments: [
    {
      name: "apiKey",
      description: "Your Exa API key",
      required: true
    },
    {
      name: "id",
      description: "The Webset ID to retrieve",
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
          text: `Use the get_webset tool with this format:
          
\`\`\`json
{
  "name": "get_webset",
  "arguments": {
    "apiKey": "${apiKey}",
    "id": "${id}"
  }
}
\`\`\`

This will retrieve details about the specified Webset from Exa's API.`
        }
      }
    ];
  }
};

// Prompt for update_webset tool
promptRegistry["update-webset"] = {
  name: "update-webset",
  description: "Update an existing Webset's properties",
  arguments: [
    {
      name: "apiKey",
      description: "Your Exa API key",
      required: true
    },
    {
      name: "id",
      description: "The Webset ID to update",
      required: true
    },
    {
      name: "search",
      description: "Updated search configuration",
      required: false
    },
    {
      name: "externalId",
      description: "New external identifier",
      required: false
    },
    {
      name: "metadata",
      description: "Updated metadata key-value pairs",
      required: false
    }
  ],
  enabled: true,
  getMessages: (args) => {
    const { apiKey, id, search, externalId, metadata } = args || {};
    
    // Build the arguments object with only provided parameters
    let argumentsObj: any = {
      apiKey,
      id
    };
    
    if (search) argumentsObj.search = search;
    if (externalId) argumentsObj.externalId = externalId;
    if (metadata) argumentsObj.metadata = metadata;
    
    return [
      {
        role: "user",
        content: {
          type: "text",
          text: `Use the update_webset tool with this format:
          
\`\`\`json
{
  "name": "update_webset",
  "arguments": ${JSON.stringify(argumentsObj, null, 2)}
}
\`\`\`

This will update the specified properties of the Webset in Exa's system.`
        }
      }
    ];
  }
};

// Prompt for list_websets tool
promptRegistry["list-websets"] = {
  name: "list-websets",
  description: "List available Websets with filtering options",
  arguments: [
    {
      name: "apiKey",
      description: "Your Exa API key",
      required: true
    },
    {
      name: "limit",
      description: "Maximum number of Websets to return",
      required: false
    },
    {
      name: "cursor",
      description: "Pagination cursor for retrieving additional results",
      required: false
    }
  ],
  enabled: true,
  getMessages: (args) => {
    const { apiKey, limit, cursor } = args || {};
    
    // Build the arguments object with only provided parameters
    let argumentsObj: any = { apiKey };
    if (limit) argumentsObj.limit = limit;
    if (cursor) argumentsObj.cursor = cursor;
    
    return [
      {
        role: "user",
        content: {
          type: "text",
          text: `Use the list_websets tool with this format:
          
\`\`\`json
{
  "name": "list_websets",
  "arguments": ${JSON.stringify(argumentsObj, null, 2)}
}
\`\`\`

This will retrieve a list of your Websets from Exa's API.`
        }
      }
    ];
  }
};

// Prompt for cancel_webset tool
promptRegistry["cancel-webset"] = {
  name: "cancel-webset",
  description: "Cancel a running Webset creation operation",
  arguments: [
    {
      name: "apiKey",
      description: "Your Exa API key",
      required: true
    },
    {
      name: "id",
      description: "The Webset ID to cancel",
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
          text: `Use the cancel_webset tool with this format:
          
\`\`\`json
{
  "name": "cancel_webset",
  "arguments": {
    "apiKey": "${apiKey}",
    "id": "${id}"
  }
}
\`\`\`

This will cancel an in-progress Webset creation operation in Exa's system.`
        }
      }
    ];
  }
};

// Prompt for delete_webset tool
promptRegistry["delete-webset"] = {
  name: "delete-webset",
  description: "Delete an existing Webset",
  arguments: [
    {
      name: "apiKey",
      description: "Your Exa API key",
      required: true
    },
    {
      name: "id",
      description: "The Webset ID to delete",
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
          text: `Use the delete_webset tool with this format:
          
\`\`\`json
{
  "name": "delete_webset",
  "arguments": {
    "apiKey": "${apiKey}",
    "id": "${id}"
  }
}
\`\`\`

This will permanently delete the specified Webset from Exa's system.`
        }
      }
    ];
  }
}; 