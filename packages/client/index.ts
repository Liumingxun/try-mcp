/* eslint-disable no-console */
/* eslint-disable antfu/no-top-level-await */
import { Client } from '@modelcontextprotocol/sdk/client/index'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio'

const transport = new StdioClientTransport({
  command: 'pnpm',
  args: ['jiti', '../server/index.ts'],
})

const mcpClient = new Client({
  name: 'example-client',
  version: '0.0.1',
})

await mcpClient.connect(transport)

// List prompts
const prompts = await mcpClient.listTools()
console.log(JSON.stringify(prompts.tools))

mcpClient.callTool({
  name: 'echo',
  arguments: {
    input: 'Hello world!',
  },
}).then((result) => {
  console.log('Tool result:', result)
}).catch((err) => {
  console.error('Error calling tool:', err)
})
