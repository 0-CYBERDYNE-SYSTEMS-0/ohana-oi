import * as dotenv from 'dotenv';
import { OpenAI } from 'openai';
import * as readline from 'readline';
import { PiClient } from './piClient';
import { createTools, executeFunction } from './tools';
import { loadSystemMessage } from './utils';
import { log } from './utils';
import { Message, Config } from './types';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['OPENAI_API_KEY', 'PI_IP', 'PI_WS_PORT'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Create configuration
const config: Config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4o',
    maxTokens: 2000,
    temperature: 0.7
  },
  pi: {
    ip: process.env.PI_IP!,
    port: parseInt(process.env.PI_WS_PORT!, 10),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
    reconnectInterval: parseInt(process.env.RECONNECT_INTERVAL || '5000', 10)
  },
  debug: process.env.DEBUG_MODE === 'true'
};

const openai = new OpenAI({
  apiKey: config.openai.apiKey
});

const piClient = new PiClient(config.pi);
const tools = createTools(piClient);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const messages: Message[] = [{
  role: 'system',
  content: loadSystemMessage()
}];

async function processUserInput(input: string) {
  try {
    messages.push({ role: 'user', content: input });
    log.user(input);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages as ChatCompletionMessageParam[],
      tools: tools.map(tool => ({
        type: 'function',
        function: tool
      })),
      tool_choice: 'auto'
    });

    const response = completion.choices[0];
    
    if (response.message.tool_calls) {
      // Add the assistant's message with tool calls
      messages.push({
        role: 'assistant',
        content: response.message.content || '',
        tool_calls: response.message.tool_calls
      });

      for (const toolCall of response.message.tool_calls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        log.system(`Executing function: ${functionName}`);
        const result = await executeFunction(functionName, args, piClient);

        messages.push({
          role: 'tool',
          content: result,
          tool_call_id: toolCall.id
        });
      }

      // Get another completion after tool responses
      const secondCompletion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: messages as ChatCompletionMessageParam[],
        tools: tools.map(tool => ({
          type: 'function',
          function: tool
        })),
        tool_choice: 'auto'
      });

      log.system(secondCompletion.choices[0].message.content || 'No response');
      messages.push({
        role: 'assistant',
        content: secondCompletion.choices[0].message.content || ''
      });
    } else {
      log.system(response.message.content || 'No response');
      messages.push({
        role: 'assistant',
        content: response.message.content || ''
      });
    }
  } catch (error) {
    console.error('Error processing input:', error);
    throw error;
  }
}

async function main() {
  try {
    log.info('Connecting to Raspberry Pi...');
    await piClient.connect();
    log.success('Connected! Starting chat...');

    const askQuestion = () => {
      rl.question('> ', async (input) => {
        if (input.toLowerCase() === 'exit') {
          piClient.disconnect();
          rl.close();
          return;
        }

        await processUserInput(input);
        askQuestion();
      });
    };

    askQuestion();
  } catch (error) {
    if (error instanceof Error) {
      log.error(`Failed to start: ${error.message}`);
    } else {
      log.error('Failed to start: An unknown error occurred');
    }
    process.exit(1);
  }
}

main(); 