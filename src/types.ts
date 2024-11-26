export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
  tool_calls?: {
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }[];
  tool_call_id?: string;
}

export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

export interface WSMessage {
  type: 'command' | 'response' | 'error' | 'status' | 'progress';
  content: string;
  id?: string;
  progress?: number;
  status?: 'running' | 'complete' | 'error';
  error?: {
    code: string;
    message: string;
  };
  environment?: {[key: string]: string};
}

export interface OpenInterpreterMessage {
  command: string;
  response?: string;
  status?: 'running' | 'complete' | 'error';
  error?: string;
  progress?: number;
  environment?: Record<string, string>;
}

export interface Config {
  openai: {
    apiKey: string;
    model: string;
    maxTokens?: number;
    temperature?: number;
  };
  pi: {
    ip: string;
    port: number;
    maxRetries: number;
    reconnectInterval: number;
  };
  debug: boolean;
}

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
} 