// src/tools/storage.ts
import { z } from "zod";
import * as fs from 'fs/promises';
import * as path from 'path';
import { toolRegistry } from "./config.js";
import { createRequestLogger } from "../utils/logger.js";
import { ResearchFinding } from "../types.js"; // Import the type

const FINDINGS_FILE = 'research_findings.json'; // Store in project root

toolRegistry["store_research_finding"] = {
  name: "store_research_finding",
  description: "Appends a research finding to a local JSON file.",
  schema: {
    finding: z.any().describe("The research finding data/object to store."),
    source: z.string().describe("The source of the finding (e.g., 'web_search', 'webset_job', 'manual')."),
    jobId: z.string().optional().describe("Optional Webset job ID associated with the finding."),
  },
  handler: async ({ finding, source, jobId }) => {
    const requestId = `store_research_finding-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, 'store_research_finding');
    logger.start(`Storing finding from source: ${source}`);

    const filePath = path.resolve(FINDINGS_FILE); // Use absolute path from project root

    try {
      let findings: ResearchFinding[] = [];

      // Check if file exists and read existing data
      try {
        const data = await fs.readFile(filePath, 'utf-8');
        findings = JSON.parse(data);
        if (!Array.isArray(findings)) {
            logger.log(`File ${FINDINGS_FILE} exists but is not a valid JSON array. Initializing new array.`);
            findings = []; // Reset if not an array
        }
      } catch (readError: any) {
        if (readError.code === 'ENOENT') {
          logger.log(`File ${FINDINGS_FILE} not found. Creating new file.`);
          // File doesn't exist, it will be created by writeFile
        } else {
          throw readError; // Re-throw other read errors
        }
      }

      // Prepare the new finding record
      const newFindingRecord: ResearchFinding = {
        finding,
        source,
        ...(jobId && { jobId }), // Conditionally add jobId
        timestamp: new Date().toISOString(),
      };

      // Append the new finding
      findings.push(newFindingRecord);

      // Write the updated array back to the file
      await fs.writeFile(filePath, JSON.stringify(findings, null, 2), 'utf-8');

      logger.log(`Finding successfully appended to ${FINDINGS_FILE}`);
      logger.complete();

      return {
        content: [{
          type: "text",
          text: JSON.stringify({ success: true, message: `Finding stored successfully in ${FINDINGS_FILE}` }, null, 2)
        }]
      };
    } catch (error) {
      logger.error(error);
      return {
        content: [{
          type: "text",
          text: `Store Research Finding error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  },
  enabled: true
};