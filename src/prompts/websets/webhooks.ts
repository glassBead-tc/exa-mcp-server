import { promptRegistry } from "../registry.js";

// Prompt for create_webhook tool
promptRegistry["create-webhook"] = {
  name: "create-webhook",
  description: "Create a new Webhook for a Webset with proper formatting",
  arguments: [
    {
      name: "apiKey",
      description: "Your Exa API key",
      required: true
    },
    {
      name: "webset",
      description: "The Webset ID to create a webhook for",
      required: true
    },
    {
      name: "url",
      description: "The URL that will receive webhook events",
      required: true
    },
    {
      name: "events",
      description: "Array of event types to subscribe to",
      required: true
    },
    {
      name: "secret",
      description: "Secret used to sign webhook payloads for verification",
      required: false
    },
    {
      name: "description",
      description: "Human-readable description of this webhook",
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
    const { apiKey, webset, url, events, secret, description, metadata } = args || {};
    
    // Build the arguments object with only provided parameters
    let argumentsObj: any = {
      apiKey,
      webset,
      url,
      events
    };
    
    if (secret) argumentsObj.secret = secret;
    if (description) argumentsObj.description = description;
    if (metadata) argumentsObj.metadata = metadata;
    
    return [
      {
        role: "user",
        content: {
          type: "text",
          text: `Use the create_webhook tool with this format:
          
\`\`\`json
{
  "name": "create_webhook",
  "arguments": ${JSON.stringify(argumentsObj, null, 2)}
}
\`\`\`

This will create a new Webhook that will notify your endpoint when specified events occur in the Webset.`
        }
      }
    ];
  }
};

// Prompt for get_webhook tool
promptRegistry["get-webhook"] = {
  name: "get-webhook",
  description: "Retrieve a Webhook by ID",
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
      description: "The Webhook ID to retrieve",
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
          text: `Use the get_webhook tool with this format:
          
\`\`\`json
{
  "name": "get_webhook",
  "arguments": {
    "apiKey": "${apiKey}",
    "webset": "${webset}",
    "id": "${id}"
  }
}
\`\`\`

This will retrieve details about the specified Webhook from the Webset.`
        }
      }
    ];
  }
};

// Prompt for update_webhook tool
promptRegistry["update-webhook"] = {
  name: "update-webhook",
  description: "Update an existing Webhook's properties",
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
      description: "The Webhook ID to update",
      required: true
    },
    {
      name: "url",
      description: "New URL for webhook notifications",
      required: false
    },
    {
      name: "events",
      description: "Updated array of event types to subscribe to",
      required: false
    },
    {
      name: "secret",
      description: "New secret for webhook payload signing",
      required: false
    },
    {
      name: "description",
      description: "Updated human-readable description",
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
    const { apiKey, webset, id, url, events, secret, description, metadata } = args || {};
    
    // Build the arguments object with only provided parameters
    let argumentsObj: any = {
      apiKey,
      webset,
      id
    };
    
    if (url) argumentsObj.url = url;
    if (events) argumentsObj.events = events;
    if (secret) argumentsObj.secret = secret;
    if (description) argumentsObj.description = description;
    if (metadata) argumentsObj.metadata = metadata;
    
    return [
      {
        role: "user",
        content: {
          type: "text",
          text: `Use the update_webhook tool with this format:
          
\`\`\`json
{
  "name": "update_webhook",
  "arguments": ${JSON.stringify(argumentsObj, null, 2)}
}
\`\`\`

This will update the specified properties of the Webhook in the Webset.`
        }
      }
    ];
  }
};

// Prompt for delete_webhook tool
promptRegistry["delete-webhook"] = {
  name: "delete-webhook",
  description: "Delete a Webhook from a Webset",
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
      description: "The Webhook ID to delete",
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
          text: `Use the delete_webhook tool with this format:
          
\`\`\`json
{
  "name": "delete_webhook",
  "arguments": {
    "apiKey": "${apiKey}",
    "webset": "${webset}",
    "id": "${id}"
  }
}
\`\`\`

This will permanently delete the specified Webhook from the Webset.`
        }
      }
    ];
  }
};

// Prompt for list_webhooks tool
promptRegistry["list-webhooks"] = {
  name: "list-webhooks",
  description: "List Webhooks for a Webset",
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
      description: "Maximum number of Webhooks to return",
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
    const { apiKey, webset, limit, cursor } = args || {};
    
    // Build the arguments object with only provided parameters
    let argumentsObj: any = {
      apiKey,
      webset
    };
    
    if (limit) argumentsObj.limit = limit;
    if (cursor) argumentsObj.cursor = cursor;
    
    return [
      {
        role: "user",
        content: {
          type: "text",
          text: `Use the list_webhooks tool with this format:
          
\`\`\`json
{
  "name": "list_webhooks",
  "arguments": ${JSON.stringify(argumentsObj, null, 2)}
}
\`\`\`

This will retrieve a list of Webhooks configured for the specified Webset.`
        }
      }
    ];
  }
};

// Prompt for list_webhook_attempts tool
promptRegistry["list-webhook-attempts"] = {
  name: "list-webhook-attempts",
  description: "List delivery attempts for a Webhook",
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
      name: "webhook",
      description: "The Webhook ID",
      required: true
    },
    {
      name: "limit",
      description: "Maximum number of attempts to return",
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
    const { apiKey, webset, webhook, limit, cursor } = args || {};
    
    // Build the arguments object with only provided parameters
    let argumentsObj: any = {
      apiKey,
      webset,
      webhook
    };
    
    if (limit) argumentsObj.limit = limit;
    if (cursor) argumentsObj.cursor = cursor;
    
    return [
      {
        role: "user",
        content: {
          type: "text",
          text: `Use the list_webhook_attempts tool with this format:
          
\`\`\`json
{
  "name": "list_webhook_attempts",
  "arguments": ${JSON.stringify(argumentsObj, null, 2)}
}
\`\`\`

This will retrieve a list of delivery attempts for the specified Webhook, including success/failure information.`
        }
      }
    ];
  }
}; 