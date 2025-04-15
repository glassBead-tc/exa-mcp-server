// Export the tool registry
export { toolRegistry, API_CONFIG } from "./config.js";

// Import all tools to register them
import "./webSearch.js";
import "./researchPaperSearch.js";
import "./twitterSearch.js";
// Import all websets tools via their index
import "./websets/index.js";
import "./storage.js"; // Import the new storage tool

// When adding a new tool, import it here
// import "./newTool.js"; 