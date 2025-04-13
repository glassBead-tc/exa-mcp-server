// Export the prompt registry
export { promptRegistry } from "./registry.js";
import { log } from "../utils/logger.js";

log('Loading prompt modules...');

// Import all prompt modules to register them
import "./websets/index.js";

log('Prompt modules loaded!');

// When adding new prompt categories, import them here
// import "./newCategory/index.js"; 