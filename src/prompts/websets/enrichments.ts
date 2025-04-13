import { promptRegistry } from "../registry.js";

// Prompt for get_enrichment tool
promptRegistry["get-enrichment"] = {
  name: "get-enrichment",
  description: "Retrieve an Enrichment by ID from a Webset",
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
      description: "The Enrichment ID to retrieve",
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
          text: `Use the get_enrichment tool with this format:
          
\`\`\`json
{
  "name": "get_enrichment",
  "arguments": {
    "apiKey": "${apiKey}",
    "webset": "${webset}",
    "id": "${id}"
  }
}
\`\`\`

This will retrieve details about the specified Enrichment from the Webset.`
        }
      }
    ];
  }
};

// Prompt for delete_enrichment tool
promptRegistry["delete-enrichment"] = {
  name: "delete-enrichment",
  description: "Delete an Enrichment from a Webset",
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
      description: "The Enrichment ID to delete",
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
          text: `Use the delete_enrichment tool with this format:
          
\`\`\`json
{
  "name": "delete_enrichment",
  "arguments": {
    "apiKey": "${apiKey}",
    "webset": "${webset}",
    "id": "${id}"
  }
}
\`\`\`

This will permanently delete the specified Enrichment from the Webset.`
        }
      }
    ];
  }
}; 