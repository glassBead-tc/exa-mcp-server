import { promptRegistry } from "../registry.js";

// Prompt for create_search tool
promptRegistry["create-search"] = {
  name: "create-search",
  description: "Create a Search for a Webset with proper formatting",
  arguments: [
    {
      name: "apiKey",
      description: "Your Exa API key",
      required: true
    },
    {
      name: "webset",
      description: "The Webset ID to create a search in",
      required: true
    },
    {
      name: "query",
      description: "Search query",
      required: true
    },
    {
      name: "count",
      description: "Number of results to attempt to find",
      required: true
    },
    {
      name: "entity",
      description: "Entity configuration for the search",
      required: true
    },
    {
      name: "criteria",
      description: "Array of criteria objects for filtering results",
      required: false
    },
    {
      name: "behaviour",
      description: "Search behaviour, e.g., 'override'",
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
    const { apiKey, webset, query, count, entity, criteria, behaviour, metadata } = args || {};
    
    // Build the arguments object with only provided parameters
    let argumentsObj: any = {
      apiKey,
      webset,
      count,
      query,
      entity
    };
    
    if (criteria) argumentsObj.criteria = criteria;
    if (behaviour) argumentsObj.behaviour = behaviour;
    if (metadata) argumentsObj.metadata = metadata;
    
    return [
      {
        role: "user",
        content: {
          type: "text",
          text: `Use the create_search tool with this format:
          
\`\`\`json
{
  "name": "create_search",
  "arguments": ${JSON.stringify(argumentsObj, null, 2)}
}
\`\`\`

This will create a new Search in the specified Webset to find relevant content based on your query and criteria.`
        }
      }
    ];
  }
};

// Prompt for get_search tool
promptRegistry["get-search"] = {
  name: "get-search",
  description: "Retrieve a Search by ID from a Webset",
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
      description: "The Search ID to retrieve",
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
          text: `Use the get_search tool with this format:
          
\`\`\`json
{
  "name": "get_search",
  "arguments": {
    "apiKey": "${apiKey}",
    "webset": "${webset}",
    "id": "${id}"
  }
}
\`\`\`

This will retrieve details about the specified Search from the Webset.`
        }
      }
    ];
  }
};

// Prompt for cancel_search tool
promptRegistry["cancel-search"] = {
  name: "cancel-search",
  description: "Cancel a running Search operation",
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
      description: "The Search ID to cancel",
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
          text: `Use the cancel_search tool with this format:
          
\`\`\`json
{
  "name": "cancel_search",
  "arguments": {
    "apiKey": "${apiKey}",
    "webset": "${webset}",
    "id": "${id}"
  }
}
\`\`\`

This will cancel an in-progress Search operation in the specified Webset.`
        }
      }
    ];
  }
}; 