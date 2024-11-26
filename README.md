# AI Assistant with Raspberry Pi Control

An AI assistant that can control a Raspberry Pi using Open Interpreter, powered by GPT-4 and WebSocket communication.

## Features

- Natural language interaction with GPT-4
- Direct control of Raspberry Pi through Open Interpreter
- Real-time communication via WebSocket
- Colorized terminal output
- Autonomous task execution
- System monitoring capabilities

## Prerequisites

- Node.js 16+ and npm
- Raspberry Pi 5 
- OpenAI API key
- Both devices on the same network
- oi_server.py 

## Setup

1. Clone the repository:
\`\`\`bash
git clone [repository-url]
cd ohana-oi
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Create a .env file:
\`\`\`bash
cp .env.example .env
\`\`\`

4. Edit the .env file with your configuration:
- Add your OpenAI API key
- Set your Raspberry Pi's local IP address
- Configure the WebSocket port (default: 8765)

5. On your Raspberry Pi, 
\`\`\`bash
python oi_server.py
\`\`\`

## Usage

1. Start the application:
\`\`\`bash
npm start
\`\`\`

2. Start chatting with the AI assistant. Example commands:
- "Check the CPU usage on the Pi"
- "Create a new file on the Pi"
- "Show me the network configuration"
- "Run a Python script"

3. Type 'exit' to quit the application

## Customization

- Edit \`system-message.txt\` to modify the AI's behavior and capabilities
- Add new tools in \`src/tools.ts\`
- Modify logging colors in \`src/utils.ts\`

## Error Handling

The application includes:
- Automatic WebSocket reconnection
- Command timeout handling
- Error logging
- Connection status monitoring

## License

MIT 