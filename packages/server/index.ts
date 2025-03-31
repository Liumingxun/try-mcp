/* eslint-disable antfu/no-top-level-await */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio'
import { z } from 'zod'

const mcpServer = new McpServer({
  name: 'example-server',
  version: '0.0.1',
})

mcpServer.tool('echo', { input: z.string() }, args => ({
  content: [{ type: 'text', text: args.input }],
}))

const transport = new StdioServerTransport()
await mcpServer.connect(transport)
