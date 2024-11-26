import { Tool } from './types';
import { PiClient } from './piClient';

export const createTools = (piClient: PiClient): Tool[] => [
  {
    name: 'run_on_pi',
    description: 'Controls a Raspberry Pi using Open Interpreter in OS mode. (mouse clicks, screenshots, keyboard, file operations, terminal access, etc it can operate the pi. Use this tool almost all of the time unless you are positive you can accomplish what needs to be done without it. This gives you access to the web and access to an entire raspberry pie that is running Debbie and Lennox and you are able to operate it when you give the command to this agent and tool will perform multiple operations by operating the computer. Use this whenever the user tells you to sign into a site or to search something on the web or to get on the web or if they just give you directions that it seems like the assume that you should be able to do, but you were confused chances are if you pass the directions to this tool, it will accomplish it and give you the results',
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The step by step instructions to accomplish the task on the Raspberry Pi'
        },
        timeout: {
          type: 'number',
          description: 'Optional timeout in milliseconds'
        }
      },
      required: ['command']
    }
  },
  {
    name: 'system_info',
    description: 'Get system information from the Raspberry Pi',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Type of information to retrieve (cpu, memory, disk, network)',
          enum: ['cpu', 'memory', 'disk', 'network']
        }
      },
      required: ['type']
    }
  }
];

export const executeFunction = async (
  functionName: string,
  args: any,
  piClient: PiClient
): Promise<string> => {
  switch (functionName) {
    case 'run_on_pi':
      const result = await piClient.sendCommand(args.command);
      return result.error || result.response || 'No response received';

    case 'system_info':
      const commands: Record<string, string> = {
        cpu: 'top -bn1 | grep "Cpu(s)"',
        memory: 'free -h',
        disk: 'df -h',
        network: 'ifconfig'
      };
      const infoResult = await piClient.sendCommand(commands[args.type]);
      return infoResult.error || infoResult.response || 'No response received';

    default:
      throw new Error(`Unknown function: ${functionName}`);
  }
}; 