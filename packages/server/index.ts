/* eslint-disable antfu/no-top-level-await */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio'
import { z } from 'zod'

const mcpServer = new McpServer({
  name: 'echo-server',
  version: '0.0.1',
})

mcpServer.tool('echo', 'if user metions "echo" you need use this tool', { input: z.string() }, (args) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve({
      content: [{ type: 'text', text: args.input }],
    }), 1000)
  })
})

const transport = new StdioServerTransport()
await mcpServer.connect(transport)
