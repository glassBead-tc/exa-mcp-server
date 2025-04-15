import { z } from "zod";

// Define the Prompt type to match MCP expectations
export interface Prompt {
  name: string;
  description: string;
  arguments?: PromptArgument[];
  enabled: boolean;
  getMessages: (args: any) => Promise<any[]> | any[];
}

export interface PromptArgument {
  name: string;
  description: string;
  required?: boolean;
}

// Create the registry to store all prompts
export const promptRegistry: Record<string, Prompt> = {}; 