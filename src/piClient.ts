import WebSocket from 'ws';
import { WSMessage, OpenInterpreterMessage, AppError, Config } from './types';
import { log } from './utils';

export class PiClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private messageQueue: Map<string, {
    resolve: (value: OpenInterpreterMessage) => void;
    reject: (reason: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }> = new Map();

  constructor(private config: Config['pi']) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `ws://${this.config.ip}:${this.config.port}`;
        log.info(`Attempting to connect to ${wsUrl}`);
        
        const connectionTimeout = setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            this.ws?.terminate();
            reject(new AppError(
              `Connection timeout - Please verify:\n` +
              `1. Open Interpreter is running and responding\n` +
              `2. WebSocket server is listening on ${this.config.port}\n` +
              `3. No firewall is blocking the connection`,
              'WS_CONNECTION_TIMEOUT'
            ));
          }
        }, 5000);
        
        this.ws = new WebSocket(wsUrl, {
          handshakeTimeout: 5000,
          headers: {
            'Content-Type': 'application/json'
          }
        });

        this.ws.on('open', () => {
          clearTimeout(connectionTimeout);
          this.reconnectAttempts = 0;
          log.success('WebSocket connection established');
          resolve();
        });

        this.ws.on('error', (error) => {
          clearTimeout(connectionTimeout);
          const errorMessage = `WebSocket error: ${error.message}`;
          log.error(errorMessage);
          reject(new AppError(errorMessage, 'WS_CONNECTION_ERROR'));
        });

        this.ws.on('close', (code, reason) => {
          clearTimeout(connectionTimeout);
          const closeMessage = `Connection to Pi closed: ${code} - ${reason}`;
          log.warning(closeMessage);
          this.handleReconnect();
        });

        this.ws.on('message', (data) => this.handleMessage(data));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reject(new AppError(`Failed to create WebSocket connection: ${errorMessage}`, 'WS_CREATION_ERROR'));
      }
    });
  }

  private handleMessage(data: WebSocket.Data) {
    try {
      const message: WSMessage = JSON.parse(data.toString());
      const handler = this.messageQueue.get(message.id!);

      if (!handler) {
        log.warning(`Received message with unknown id: ${message.id}`);
        return;
      }

      switch (message.type) {
        case 'progress':
          // Handle progress updates without resolving the promise
          log.info(`Command progress: ${message.progress}%`);
          break;

        case 'error':
          handler.reject(new AppError(message.error!.message, message.error!.code));
          this.messageQueue.delete(message.id!);
          break;

        case 'response':
        case 'status':
          if (message.status === 'complete' || message.type === 'response') {
            clearTimeout(handler.timeout);
            handler.resolve({
              command: message.content,
              response: message.content,
              status: message.status,
              progress: message.progress
            });
            this.messageQueue.delete(message.id!);
          }
          break;
      }
    } catch (error) {
      if (error instanceof Error) {
        log.error(`Failed to handle message: ${error.message}`);
      }
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.config.maxRetries) {
      this.reconnectAttempts++;
      log.info(`Attempting to reconnect (${this.reconnectAttempts}/${this.config.maxRetries})...`);
      setTimeout(() => this.connect(), this.config.reconnectInterval);
    } else {
      const error = new AppError(
        'Max reconnection attempts reached',
        'WS_MAX_RETRIES'
      );
      log.error(error.message);
      this.handleAllPendingErrors(error);
    }
  }

  private handleAllPendingErrors(error: AppError) {
    for (const [id, handler] of this.messageQueue) {
      clearTimeout(handler.timeout);
      handler.reject(error);
      this.messageQueue.delete(id);
    }
  }

  async sendCommand(
    command: string,
    timeout: number = 30000,
    env?: Record<string, string>
  ): Promise<OpenInterpreterMessage> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new AppError('WebSocket is not connected', 'WS_NOT_CONNECTED');
    }

    return new Promise((resolve, reject) => {
      const id = Date.now().toString();
      const message: WSMessage = {
        type: 'command',
        content: command,
        id,
        environment: env
      };

      const timeoutId = setTimeout(() => {
        this.messageQueue.delete(id);
        reject(new AppError('Command timed out', 'COMMAND_TIMEOUT'));
      }, timeout);

      this.messageQueue.set(id, { resolve, reject, timeout: timeoutId });

      try {
        this.ws!.send(JSON.stringify(message));
      } catch (error) {
        this.messageQueue.delete(id);
        clearTimeout(timeoutId);
        reject(new AppError('Failed to send command', 'SEND_ERROR', error));
      }
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
  }
} 