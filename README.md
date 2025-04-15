# Exa MCP Server 🔍
[![npm version](https://badge.fury.io/js/exa-mcp-server.svg)](https://www.npmjs.com/package/exa-mcp-server)
[![smithery badge](https://smithery.ai/badge/exa)](https://smithery.ai/server/exa)

A Model Context Protocol (MCP) server lets AI assistants like Claude use the Exa AI Search API for web searches. This setup allows AI models to get real-time web information in a safe and controlled way.

Demo video https://www.loom.com/share/ac676f29664e4c6cb33a2f0a63772038?sid=0e72619f-5bfc-415d-a705-63d326373f60


## What is MCP? 🤔

The Model Context Protocol (MCP) is a system that lets AI apps, like Claude Desktop, connect to external tools and data sources. It gives a clear and safe way for AI assistants to work with local services and APIs while keeping the user in control.

## What does this server do? 🚀

The Exa MCP server provides two main sets of functionality:

### 1. Direct Exa Search API Access
- Enables real-time web searches with full content extraction using Exa's powerful search API
- Supports specialized searches for Twitter/X.com content and academic research papers
- Features HTTP streaming support for faster results delivery
- Handles rate limiting and error cases gracefully

### 2. Exa Websets Management
- Create and manage curated collections of web content (Websets)
- Track and manage items within your Websets
- Configure webhooks for automation workflows
- Monitor events related to your Websets
- Automate content curation workflows

## Prerequisites 📋

Before you begin, ensure you have:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Claude Desktop](https://claude.ai/download) installed
- An [Exa API key](https://dashboard.exa.ai/api-keys)
- Git installed

You can verify your Node.js installation by running:
```bash
node --version  # Should show v18.0.0 or higher
```

## Installation 🛠️

### NPM Installation

```bash
npm install -g exa-mcp-server
```

### Using Smithery

To install the Exa MCP server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/exa):

```bash
npx -y @smithery/cli install exa --client claude
```

### Manual Installation

1. Clone the repository:

```bash
git clone https://github.com/exa-labs/exa-mcp-server.git
cd exa-mcp-server
```

2. Install dependencies:

```bash
npm install
```

3. Build the project:

```bash
npm run build
```

4. Create a global link (this makes the server executable from anywhere):

```bash
npm link
```

## Configuration ⚙️

### 1. Configure Claude Desktop to recognize the Exa MCP server

You can find claude_desktop_config.json inside the settings of Claude Desktop app:

Open the Claude Desktop app and enable Developer Mode from the top-left menu bar. 

Once enabled, open Settings (also from the top-left menu bar) and navigate to the Developer Option, where you'll find the Edit Config button. Clicking it will open the claude_desktop_config.json file, allowing you to make the necessary edits. 

OR (if you want to open claude_desktop_config.json from terminal)

#### For macOS:

1. Open your Claude Desktop configuration:

```bash
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

#### For Windows:

1. Open your Claude Desktop configuration:

```powershell
code %APPDATA%\Claude\claude_desktop_config.json
```

### 2. Add the Exa server configuration:

```json
{
  "mcpServers": {
    "exa": {
      "command": "npx",
      "args": [
        "/path/to/exa-mcp-server/build/index.js",
        "--tools=web_search,initiate_webset,get_webset_status,list_websets"
      ],
      "env": {
        "EXA_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

Replace `your-api-key-here` with your actual Exa API key from [dashboard.exa.ai/api-keys](https://dashboard.exa.ai/api-keys).

### 3. Available Tools & Tool Selection

The Exa MCP server includes the following tools:

#### Direct Search Tools
- **web_search**: Performs real-time web searches with optimized results and content extraction. Supports HTTP streaming for faster results delivery.
- **research_paper_search**: Specialized search focused on academic papers and research content. Supports HTTP streaming.
- **twitter_search**: Dedicated Twitter/X.com search that finds tweets, profiles, and conversations. Supports HTTP streaming.

#### Websets Management Tools (Asynchronous - Recommended)
- **`create_webset_async`**: Initiates an asynchronous job to create a Webset. Returns a `jobId`. (See Asynchronous Workflow section)
- **`get_webset_job_status`**: Checks the status and retrieves results of an asynchronous Webset job using its `jobId`. (See Asynchronous Workflow section)

#### Websets Management Tools (Legacy / Direct)
- **`create_webset`**: [DEPRECATED] Synchronously creates a Webset. May time out.
- **`get_webset`**: [DEPRECATED] Retrieves a specific Webset by ID.
- **`initiate_webset`**: [DEPRECATED - Use `create_webset_async`] Starts synchronous creation, returns Webset ID. (See Two-Phase section)
- **`get_webset_status`**: [DEPRECATED - Use `get_webset_job_status`] Checks status of synchronous creation using Webset ID. (See Two-Phase section)
- **`update_webset`**: Updates an existing Webset's metadata.
- **`list_websets`**: Lists all available Websets with pagination support.
- **`cancel_webset`**: Cancels a running Webset creation job.
- **`delete_webset`**: Deletes a Webset by ID.

#### Research Utility Tools
- **`store_research_finding`**: Stores a text finding with its source, optionally linked to a `jobId`. (See Research Utility Tools section)

#### Two-Phase Webset Creation (Legacy)

**Note:** The [Asynchronous Webset Workflow](#asynchronous-webset-workflow-recommended) is now the recommended approach for handling long-running Webset creation, as it offers more flexibility. This two-phase method remains available but is less preferred.

Websets creation can be a long-running process that may exceed typical MCP timeouts (60 seconds). This legacy two-phase approach uses `initiate_webset` and `get_webset_status`:

1. **Phase 1: Initiate Webset Creation**
   - Use the `initiate_webset` tool (now deprecated) to start the process.
   - Returns immediately with a Webset ID for tracking.

2. **Phase 2: Check Status & Retrieve Results**
   - Use the `get_webset_status` tool (now deprecated) with the Webset ID.
   - Check periodically until completion.
   - When `isComplete=true`, the full results are available.

Example pattern for Claude:
```
# First create the webset and get the ID
Call initiate_webset with your search parameters
Remember the websetId from the response

# Then periodically check status until complete
Call get_webset_status with the websetId
Wait a reasonable time (5-15 seconds) if still in progress
Repeat until isComplete=true
```

Here's an example of the typical interaction flow:

1. **Start the webset creation:**
   ```
   Claude, please initiate a webset with a search for "AI startups in healthcare" and find 20 results.
   ```

2. **Claude initiates the webset using the initiate_webset tool and receives a tracking ID:**
   ```json
   {
     "websetId": "wbs_01H2X3Y4Z5A6B7C8D9E0F",
     "status": "running",
     "searchStatus": "created",
     "message": "Webset creation initiated. Use get_webset_status to check progress and retrieve results when complete."
   }
   ```

3. **The user asks to check status:**
   ```
   Check if that webset is ready yet. If not, let me know the progress.
   ```

4. **Claude checks status using get_webset_status:**
   ```json
   {
     "websetId": "wbs_01H2X3Y4Z5A6B7C8D9E0F",
     "status": "running",
     "searchStatus": "running",
     "progressPercent": 35,
     "isComplete": false,
     "isCanceled": false,
     "message": "Webset creation in progress. Continue checking with get_webset_status."
   }
   ```

5. **After a few more status checks, the webset completes:**
   ```json
   {
     "websetId": "wbs_01H2X3Y4Z5A6B7C8D9E0F",
     "status": "idle",
     "searchStatus": "completed",
     "progressPercent": 100,
     "isComplete": true,
     "isCanceled": false,
     "details": {
       // Full webset details here
     }
   }
   ```

### Running the Two-Phase Demo

We've included a demo script that shows how the two-phase approach works outside of Claude:

```bash
# Navigate to the examples directory
cd examples

# Install dependencies
npm install

# Run the demo (replace with your actual API key)
EXA_API_KEY=your-api-key-here npm run demo
```

This script demonstrates:
1. How to initiate a webset creation
2. How to poll for status until completion
3. How to handle the completed results

You can use this pattern in your own applications when working with long-running Exa Websets.

### Asynchronous Webset Workflow (Recommended)

For more complex research tasks that involve creating Websets alongside other actions like web searches, a fully asynchronous workflow is available. This allows you to initiate a Webset creation job and continue interacting with the MCP server (e.g., using `web_search` or `store_research_finding`) while the Webset is processed in the background.

This workflow uses the following tools:

*   **`create_webset_async`**:
    *   **Purpose**: Initiates an asynchronous job to create a Webset based on specified criteria (similar parameters to the deprecated `create_webset`).
    *   **Input**: Search query, number of results, etc.
    *   **Output**: Returns a unique `jobId` immediately, allowing other operations to proceed.

*   **`get_webset_job_status`**:
    *   **Purpose**: Checks the status and retrieves results of an asynchronous Webset creation job.
    *   **Input**: The `jobId` obtained from `create_webset_async`.
    *   **Output**: An object containing the job's current `status` (e.g., `pending`, `processing`, `completed`, `failed`), `results` (if completed), or `error` details (if failed). This tool needs to be called periodically to get updates until the status is `completed` or `failed`.

**Concurrency:** While an asynchronous job initiated by `create_webset_async` is running, you can use other tools like `web_search`, `research_paper_search`, or `store_research_finding` without waiting for the Webset job to finish.

**Example Interaction:**

1.  **Start the async job:**
    ```
    Claude, please create a webset asynchronously for "latest advancements in renewable energy technologies", find 15 results.
    ```
2.  **Claude uses `create_webset_async` and gets a `jobId`:**
    ```json
    { "jobId": "job_async_12345abcde" }
    ```
3.  **Perform other tasks while waiting:**
    ```
    Now, search the web for reviews of the latest solar panel efficiencies.
    ```
    *(Claude uses `web_search`)*
4.  **Store a finding:**
    ```
    Store this finding: 'XYZ Solar claims 25% efficiency in their new panel.' with source 'https://example-review.com' and associate it with job 'job_async_12345abcde'.
    ```
    *(Claude uses `store_research_finding`)*
5.  **Check job status periodically:**
    ```
    What's the status of the webset job 'job_async_12345abcde'?
    ```
6.  **Claude uses `get_webset_job_status`:**
    ```json
    {
      "jobId": "job_async_12345abcde",
      "status": "processing",
      "progress": "Fetching results...",
      "results": null,
      "error": null
    }
    ```
7.  **Eventually, the job completes:**
    ```json
    {
      "jobId": "job_async_12345abcde",
      "status": "completed",
      "progress": "Done",
      "results": {
        // Full webset results here
      },
      "error": null
    }
    ```

This asynchronous approach provides greater flexibility for complex research workflows.


### Research Utility Tools

These tools assist during the research process, especially when using the asynchronous workflow.

*   **`store_research_finding`**:
    *   **Purpose**: Allows storing arbitrary text findings discovered during research (e.g., from `web_search` or user input) alongside their source.
    *   **Input**:
        *   `finding` (string): The text content of the finding.
        *   `source` (string): The URL or origin of the finding.
        *   `jobId` (string, optional): Associates the finding with a specific asynchronous Webset job.
    *   **Storage**: Findings are appended to a local JSON file named `research_findings.json` in the server's working directory.
    *   **Use Case**: Useful for collecting snippets, quotes, or key data points during a research session, potentially linking them back to the Webset job they relate to.

**Example:**

```
Claude, store the finding 'Quantum computing market projected to reach $50B by 2030.' from source 'https://market-report.example.com'.
```

*(Claude uses `store_research_finding`)*


#### Webset Items Tools
- **get_item**: Retrieve a specific item from a Webset.
- **list_items**: List all items in a Webset with filtering options and streaming support.

#### Webhook Management Tools
- **create_webhook**: Register a new webhook for Websets events.
- **get_webhook**: Retrieve a specific webhook by ID.
- **update_webhook**: Update an existing webhook's configuration.
- **delete_webhook**: Delete a webhook by ID.
- **list_webhooks**: List all registered webhooks.
- **list_webhook_attempts**: View webhook delivery attempts for debugging.

#### Events Tools
- **list_events**: List all events that have occurred in the Websets system. Supports HTTP streaming.
- **get_event**: Retrieve a specific event by ID.

You can choose which tools to enable by adding the `--tools` parameter to your Claude Desktop configuration:

#### Specify which tools to enable:

```json
{
  "mcpServers": {
    "exa": {
      "command": "npx",
      "args": [
        "/path/to/exa-mcp-server/build/index.js",
        "--tools=web_search,create_webset_async,get_webset_job_status,store_research_finding,list_websets"
      ],
      "env": {
        "EXA_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### 4. Restart Claude Desktop

For the changes to take effect:

1. Completely quit Claude Desktop (not just close the window)
2. Start Claude Desktop again
3. Look for the 🔌 icon to verify the Exa server is connected

## Using via NPX

If you prefer to run the server directly, you can use npx:

```bash
# Run with all tools enabled by default
npx exa-mcp-server

# Enable specific tools only
npx exa-mcp-server --tools=web_search

# Enable multiple tools
npx exa-mcp-server --tools=web_search,research_paper_search

# List all available tools
npx exa-mcp-server --list-tools
```

## Usage 🎯

Once configured, you can interact with the Exa MCP server through Claude:

### Direct Search Examples

```
Can you search for recent developments in quantum computing?
```

```
Search for and summarize the latest news about artificial intelligence startups in new york.
```

```
Find and analyze recent research papers about climate change solutions.
```

```
Search Twitter for posts from @elonmusk about SpaceX.
```

```
Find tweets from @samaltman that were published in the last week about AI safety.
```

### Websets Management Examples

```
# Using the recommended two-phase approach for long-running webset creation
Create a new webset about AI startups in Europe using the two-phase approach to handle potential timeouts.
```

```
# Check on the status of a previously initiated webset
Check if my webset about AI startups is complete and retrieve the results if it's ready.
```

```
# Traditional approach (may timeout for complex searches)
Create a new Webset to collect information about renewable energy startups in Europe.
```

```
List all items in my webset about climate technology.
```

### Webhooks & Events Examples
