export interface ExaWebsetsRequest {
  search: {
    query: string;
    count?: number;
    entity?: {
      type: "company";
    };
    criteria?: Array<{
      description: string;
    }>;
  };
  enrichments?: Array<{
    description: string;
    format?: "text" | "date" | "number" | "options" | "email" | "phone";
    options?: Array<{
      label: string;
    }>;
    metadata?: Record<string, string>;
  }>;
  externalId?: string;
  metadata?: Record<string, string>;
}

export interface ExaWebsetsResponse {
  id: string;
  object: "webset";
  status: "idle" | "running" | "paused";
  externalId: string | null;
  searches: Array<{
    id: string;
    object: "webset_search";
    status: "created" | "running" | "completed" | "canceled";
    query: string;
    entity: {
      type: "company";
    };
    criteria: Array<{
      description: string;
      successRate: number;
    }>;
    count: number;
    progress: {
      found: number;
      completion: number;
    };
    metadata: Record<string, string> | null;
    canceledAt: string | null;
    canceledReason: "webset_deleted" | "webset_canceled" | null;
    createdAt: string;
    updatedAt: string;
  }>;
  enrichments: Array<{
    id: string;
    object: "webset_enrichment";
    status: "pending" | "canceled" | "completed";
    websetId: string;
    title: string | null;
    description: string;
    format: "text" | "date" | "number" | "options" | "email" | "phone";
    options: Array<{
      label: string;
    }> | null;
    instructions: string | null;
    metadata: Record<string, string> | null;
    createdAt: string;
    updatedAt: string;
  }>;
  metadata: Record<string, string> | null;
  createdAt: string;
  updatedAt: string;
  items?: Array<{
    id: string;
    object: "webset_item";
    source: "search";
    sourceId: string;
    websetId: string;
    properties: {
      type: "person";
      url: string;
      description: string;
      person: {
        name: string;
        location: string | null;
        position: string | null;
        pictureUrl: string | null;
      };
    };
    evaluations: Array<{
      criterion: string;
      reasoning: string;
      satisfied: "yes" | "no" | "unclear";
      references: Array<{
        title: string | null;
        snippet: string | null;
        url: string;
      }> | null;
    }>;
    enrichments: Array<{
      object: "enrichment_result";
      format: "text" | "date" | "number" | "options" | "email" | "phone";
      result: string[];
      reasoning: string | null;
      references: Array<{
        title: string | null;
        snippet: string | null;
        url: string;
      }>;
      enrichmentId: string;
    }> | null;
    createdAt: string;
    updatedAt: string;
  }>;
}

// Exa API Types
export interface ExaSearchRequest {
  query: string;
  type: string;
  category?: string;
  includeDomains?: string[];
  startPublishedDate?: string;
  endPublishedDate?: string;
  numResults: number;
  contents: {
    text: {
      maxCharacters?: number;
    } | boolean;
    livecrawl?: 'always' | 'fallback';
  };
}

export interface ExaSearchResult {
  id: string;
  title: string;
  url: string;
  publishedDate: string;
  author: string;
  text: string;
  image?: string;
  favicon?: string;
  score?: number;
}

export interface ExaSearchResponse {
  requestId: string;
  autopromptString: string;
  resolvedSearchType: string;
  results: ExaSearchResult[];
}

// Tool Types
export interface SearchArgs {
  query: string;
  numResults?: number;
  livecrawl?: 'always' | 'fallback';
}

// Webhook Types
export interface ExaWebhook {
  id: string;
  object: "webhook";
  status: "active" | "inactive";
  events: string[];
  url: string;
  secret: string | null;
  metadata: Record<string, string> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExaWebhookListResponse {
  data: ExaWebhook[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface ExaWebhookAttempt {
  id: string;
  object: "webhook_attempt";
  eventId: string;
  eventType: string;
  webhookId: string;
  url: string;
  successful: boolean;
  responseHeaders: Record<string, string>;
  responseBody: string | null;
  responseStatusCode: number;
  attempt: number;
  attemptedAt: string;
}

export interface ExaWebhookAttemptListResponse {
  data: ExaWebhookAttempt[];
  hasMore: boolean;
  nextCursor: string | null;
}

// Event Types
export interface ExaBaseEvent {
  id: string;
  object: "event";
  type: string;
  data: Record<string, any>;
  createdAt: string;
}

export interface ExaEventListResponse {
  data: ExaBaseEvent[];
  hasMore: boolean;
  nextCursor: string | null;
}

// Async Job Management Types
export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface JobData {
  jobId: string;
  websetId: string | null; // Exa's websetId
  status: JobStatus;
  results: any | null; // Store results from get_webset_status
  error: any | null; // Store any errors encountered
  createdAt: Date;
  updatedAt: Date;
}

// Define the input parameters for the actual Exa API calls
// Re-defining based on provided schema for clarity within the job manager context.
export interface ExaCreateWebsetParams {
  apiKey: string;
  search: {
    query: string;
    count?: number;
    entity?: {
      type: 'company';
    };
    criteria?: Array<{ description: string }>;
  };
  enrichments?: Array<{
    description: string;
    format?: 'text' | 'date' | 'number' | 'options' | 'email' | 'phone';
    options?: Array<{ label: string }>;
    metadata?: Record<string, string>;
  }>;
  externalId?: string;
  metadata?: Record<string, string>;
}

export interface ExaGetWebsetStatusParams {
  apiKey: string;
  websetId: string;
  expand?: string;
  includeDetails?: boolean;
}


// Define the structure for stored research findings
export interface ResearchFinding {
  finding: any;
  source: string;
  jobId?: string;
  timestamp: string;
}
