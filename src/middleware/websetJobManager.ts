// src/middleware/websetJobManager.ts
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  JobData,
  JobStatus,
  ExaCreateWebsetParams,
  ExaGetWebsetStatusParams,
  ExaWebsetsResponse, // Assuming this type covers the response for both create and get status
} from '../types.js'; // Adjust path as needed
import { createRequestLogger } from '../utils/logger.js'; // Adjust path as needed

const logger = createRequestLogger('WebsetJobManager', 'middleware');

class WebsetJobManager {
  private jobs: Map<string, JobData>;

  constructor() {
    this.jobs = new Map<string, JobData>();
    logger.log('WebsetJobManager initialized');
  }

  // --- Private Helper for Exa API Calls ---
  private async _callExaApi<T>(
    method: 'get' | 'post' | 'delete', // Add other methods if needed
    url: string,
    apiKey: string,
    payload?: any
  ): Promise<T> {
    const axiosInstance = axios.create({
      baseURL: 'https://api.exa.ai',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-api-key': apiKey,
      },
      timeout: 30000, // 30 seconds timeout
    });

    try {
      let response;
      if (method === 'post') {
        response = await axiosInstance.post<T>(url, payload);
      } else if (method === 'get') {
        response = await axiosInstance.get<T>(url, { params: payload }); // Use params for GET
      } else if (method === 'delete') {
        response = await axiosInstance.delete<T>(url);
      } else {
        throw new Error(`Unsupported HTTP method: ${method}`);
      }
      return response.data;
    } catch (error) {
      logger.error(`Exa API call failed (${method.toUpperCase()} ${url}): ${error instanceof Error ? error.message : String(error)}`);
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status || 'unknown';
        const errorMessage = error.response?.data?.message || error.message;
        throw new Error(`Exa API Error (${statusCode}): ${errorMessage}`);
      }
      throw error; // Re-throw other errors
    }
  }

  // --- Public Job Management Methods ---

  /**
   * Initiates a Webset creation job with Exa.
   * Returns a jobId to track the asynchronous operation.
   */
  async startWebsetJob(params: ExaCreateWebsetParams): Promise<string> {
    const jobId = uuidv4();
    const now = new Date();

    const initialJobData: JobData = {
      jobId,
      websetId: null,
      status: JobStatus.PENDING,
      results: null,
      error: null,
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.set(jobId, initialJobData);
    logger.log(`Job ${jobId}: Created (Status: PENDING)`);

    try {
      // Prepare payload for Exa API
      const { apiKey, ...createPayload } = params;

      logger.log(`Job ${jobId}: Calling Exa create_webset API`);
      const response = await this._callExaApi<ExaWebsetsResponse>(
        'post',
        '/websets/v0/websets',
        apiKey,
        createPayload
      );

      // Update job with websetId and set status to RUNNING
      const websetId = response.id;
      const updatedJobData: JobData = {
        ...initialJobData,
        websetId: websetId,
        status: JobStatus.RUNNING, // Exa creation is async, so it's now running
        updatedAt: new Date(),
      };
      this.jobs.set(jobId, updatedJobData);
      logger.log(`Job ${jobId}: Exa Webset ${websetId} creation initiated (Status: RUNNING)`);

      return jobId;
    } catch (error: any) {
      // Update job with error and set status to FAILED
      const errorJobData: JobData = {
        ...initialJobData,
        status: JobStatus.FAILED,
        error: error.message || String(error),
        updatedAt: new Date(),
      };
      this.jobs.set(jobId, errorJobData);
      logger.error(`Job ${jobId}: Failed during initiation - ${errorJobData.error}`);
      // We still return the jobId, the user can check the status to see the failure
      return jobId;
    }
  }

  /**
   * Retrieves the status and results of a Webset job.
   * Fetches the latest status from Exa if the job is still pending/running.
   */
  async getJobStatus(jobId: string, apiKey: string): Promise<Partial<JobData>> {
    const job = this.jobs.get(jobId);

    if (!job) {
      logger.log(`getJobStatus: Job ${jobId} not found.`); // Use log for informational warning
      throw new Error(`Job with ID ${jobId} not found.`);
    }

    // If job is already completed or failed, return stored data
    if (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED) {
      logger.log(`Job ${jobId}: Returning stored status (${job.status})`);
      return {
        status: job.status,
        results: job.results,
        error: job.error,
      };
    }

    // If job is pending or running, and we have a websetId, check Exa API
    if (!job.websetId) {
        // This might happen if startWebsetJob failed immediately
        logger.log(`Job ${jobId}: No websetId available, returning current status (${job.status})`); // Use log for informational warning
         return {
            status: job.status,
            results: job.results,
            error: job.error,
        };
    }

    try {
      logger.log(`Job ${jobId}: Checking Exa status for Webset ${job.websetId}`);
      const params: ExaGetWebsetStatusParams = {
        apiKey,
        websetId: job.websetId,
        // expand: 'items', // Optionally expand to get full results on completion
        includeDetails: true,
      };

      // Build the URL with optional expand parameter
      let url = `/websets/v0/websets/${encodeURIComponent(params.websetId)}`;
      if (params.expand) {
        url += `?expand=${encodeURIComponent(params.expand)}`;
      }

      const response = await this._callExaApi<ExaWebsetsResponse>(
        'get',
        url,
        apiKey
      );

      // Update job status based on Exa response
      const websetData = response;
      const searchStatus = websetData.searches.length > 0 ? websetData.searches[0].status : 'not_started';
      const isComplete = searchStatus === 'completed';
      const isCanceled = searchStatus === 'canceled'; // Treat canceled as failed for simplicity

      let newStatus: JobStatus = job.status; // Explicitly type newStatus
      let results = job.results;
      let error = job.error;

      if (isComplete) {
        newStatus = JobStatus.COMPLETED;
        results = websetData; // Store the full response as results
        logger.log(`Job ${jobId}: Status updated to COMPLETED`);
      } else if (isCanceled) {
        newStatus = JobStatus.FAILED;
        error = `Webset creation was canceled (Reason: ${websetData.searches[0]?.canceledReason || 'Unknown'})`;
        results = websetData; // Store response even on failure
        logger.log(`Job ${jobId}: Status updated to FAILED (Canceled)`); // Use log for informational warning
      } else {
        // Still running or in another state, keep status RUNNING
        newStatus = JobStatus.RUNNING;
        results = websetData; // Update with latest partial data
        logger.log(`Job ${jobId}: Status remains RUNNING (Exa status: ${searchStatus})`);
      }

      const updatedJobData: JobData = {
        ...job,
        status: newStatus,
        results: results,
        error: error,
        updatedAt: new Date(),
      };
      this.jobs.set(jobId, updatedJobData);

      return {
        status: updatedJobData.status,
        results: updatedJobData.results,
        error: updatedJobData.error,
      };

    } catch (error: any) {
      // Handle errors during status check
      logger.error(`Job ${jobId}: Failed during status check - ${error.message || String(error)}`);
      const errorJobData: JobData = {
        ...job,
        status: JobStatus.FAILED,
        error: `Status check failed: ${error.message || String(error)}`,
        updatedAt: new Date(),
      };
      this.jobs.set(jobId, errorJobData);
      return {
        status: errorJobData.status,
        results: errorJobData.results,
        error: errorJobData.error,
      };
    }
  }


    /**
     * Handles incoming webhook updates from Exa.
     * Updates the status of the corresponding job if found.
     */
    async handleWebhookUpdate(payload: any): Promise<void> {
      logger.log(`Received webhook payload: ${JSON.stringify(payload)}`);

      // Basic payload validation (adjust based on actual Exa webhook structure)
      if (!payload || typeof payload !== 'object' || !payload.type || !payload.data || !payload.data.id) {
        logger.log('Received invalid or incomplete webhook payload.');
        return;
      }

      const eventType: string = payload.type;
      const websetId: string = payload.data.id;
      const eventData: ExaWebsetsResponse = payload.data; // Assuming payload.data matches ExaWebsetsResponse structure

      logger.log(`Processing webhook event: ${eventType} for websetId: ${websetId}`);

      let jobFound = false;
      for (const [jobId, job] of this.jobs.entries()) {
        if (job.websetId === websetId) {
          jobFound = true;
          logger.log(`Found matching job ${jobId} for websetId ${websetId}`);

          // Avoid processing if job is already in a terminal state
          if (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED) {
            logger.log(`Job ${jobId} is already in terminal state (${job.status}). Ignoring webhook update.`);
            return; // Exit the loop and function
          }

          let newStatus: JobStatus = job.status;
          let results: any = job.results;
          let error: string | null = job.error;
          const now = new Date();

          // Determine status based on event type and data
          // Assuming 'search' completion/cancellation is the primary indicator for now
          const searchStatus = eventData.searches && eventData.searches.length > 0 ? eventData.searches[0].status : null;

          if (eventType === 'webset.search.completed' || searchStatus === 'completed') {
            newStatus = JobStatus.COMPLETED;
            results = eventData; // Store the full event data
            error = null;
            logger.log(`Job ${jobId}: Webhook updated status to COMPLETED`);
          } else if (eventType === 'webset.search.canceled' || searchStatus === 'canceled') {
            newStatus = JobStatus.FAILED;
            error = `Webset processing failed or was canceled via webhook (Reason: ${eventData.searches[0]?.canceledReason || 'Unknown'})`;
            results = eventData; // Store event data even on failure
            logger.log(`Job ${jobId}: Webhook updated status to FAILED (Canceled/Failed)`);
          } else {
            // Handle other relevant event types if necessary
            // For now, just log if it's not a completion/failure event we explicitly handle
            logger.log(`Job ${jobId}: Received unhandled relevant event type '${eventType}'. Status remains ${job.status}.`);
            // Optionally update results with the latest data even if status doesn't change
            results = eventData;
          }

          // Update the job only if the status changed or results/error were updated
          if (newStatus !== job.status || results !== job.results || error !== job.error) {
            const updatedJobData: JobData = {
              ...job,
              status: newStatus,
              results: results,
              error: error,
              updatedAt: now,
            };
            this.jobs.set(jobId, updatedJobData);
            logger.log(`Job ${jobId}: Updated via webhook (Status: ${newStatus})`);
          }

          return; // Found and processed the job, no need to check further
        }
      }

      if (!jobFound) {
        logger.log(`No active job found for websetId ${websetId} from webhook event ${eventType}.`);
      }
    }

  // Optional: Method to clean up old jobs if needed
  // cleanupJobs(maxAgeMinutes: number) { ... }
}

// Export a singleton instance
export const websetJobManager = new WebsetJobManager();