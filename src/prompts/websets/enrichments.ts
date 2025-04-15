import { promptRegistry } from "../registry.js";

// Prompt for create_enrichment tool
promptRegistry["create-enrichment"] = {
  name: "create-enrichment",
  description: "Create an Enrichment for a Webset",
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
      name: "description",
      description: "Description of the enrichment task to perform on each Webset Item",
      required: true
    },
    {
      name: "format",
      description: "Format of the enrichment response (text, date, number, options, email, phone)",
      required: false
    },
    {
      name: "options",
      description: "When the format is options, the different options for the enrichment agent to choose from",
      required: false
    },
    {
      name: "metadata",
      description: "Metadata key-value pairs",
      required: false
    }
  ],
  enabled: true,
  getMessages: (args) => {
    const { apiKey, webset, description, format, options, metadata } = args || {};
    
    // Build the arguments object with only provided parameters
    let argumentsObj: any = {
      apiKey,
      webset,
      description
    };
    
    if (format) argumentsObj.format = format;
    if (options) argumentsObj.options = options;
    if (metadata) argumentsObj.metadata = metadata;
    
    return [
      {
        role: "user",
        content: {
          type: "text",
          text: `Use the create_enrichment tool with this format:
          
\`\`\`json
{
  "name": "create_enrichment",
  "arguments": ${JSON.stringify(argumentsObj, null, 2)}
}
\`\`\`

This will create a new Enrichment for the specified Webset.`
        }
      }
    ];
  }
};

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

// Prompt for cancel_enrichment tool
promptRegistry["cancel-enrichment"] = {
  name: "cancel-enrichment",
  description: "Cancel a running Enrichment by ID",
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
      description: "The Enrichment ID to cancel",
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
          text: `Use the cancel_enrichment tool with this format:
          
\`\`\`json
{
  "name": "cancel_enrichment",
  "arguments": {
    "apiKey": "${apiKey}",
    "webset": "${webset}",
    "id": "${id}"
  }
}
\`\`\`

This will cancel a running Enrichment process for the specified Webset.`
        }
      }
    ];
  }
}; 