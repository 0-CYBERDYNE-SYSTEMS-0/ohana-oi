import * as fs from 'fs';
import * as path from 'path';

export const log = {
  info: (message: string) => console.log('\x1b[36m%s\x1b[0m', `ℹ️ ${message}`),
  success: (message: string) => console.log('\x1b[32m%s\x1b[0m', `✅ ${message}`),
  warning: (message: string) => console.log('\x1b[33m%s\x1b[0m', `⚠️ ${message}`),
  error: (message: string) => console.log('\x1b[31m%s\x1b[0m', `❌ ${message}`),
  system: (message: string) => console.log('\x1b[35m%s\x1b[0m', `🤖 ${message}`),
  user: (message: string) => console.log('\x1b[34m%s\x1b[0m', `👤 ${message}`),
};

export function loadSystemMessage(): string {
  try {
    return fs.readFileSync(path.join(process.cwd(), 'system-message.txt'), 'utf-8');
  } catch (error) {
    log.error('Failed to load system message');
    throw error;
  }
}

export function formatToolResponse(response: any): string {
  return typeof response === 'object' 
    ? JSON.stringify(response, null, 2)
    : String(response);
} 