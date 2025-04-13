// Import all websets prompt modules
import { log } from "../../utils/logger.js";

log('Loading websets prompt modules...');

import "./websets.js";
import "./items.js";
import "./searches.js";
import "./webhooks.js";
import "./events.js";
import "./enrichments.js";

log('Websets prompt modules loaded!');

// When adding new websets prompt modules, import them here 