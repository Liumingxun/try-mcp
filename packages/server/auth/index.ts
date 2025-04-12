/* eslint-disable antfu/no-top-level-await */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types'
import { z } from 'zod'
import { getPetDetail } from './api'

const mcpServer = new McpServer({
  name: 'auth-pet-store-server',
  version: '0.0.1',
})

const tool_map = {
  getPetDetail,
}

mcpServer.server.registerCapabilities({
  tools: {},
})

mcpServer.server.setRequestHandler(ListToolsRequestSchema, ({ params }) => {
  const token = params && 'token' in params ? (params as { token: string }).token : undefined
  return {
    tools: token
      ? [
          {
            name: 'getPetDetail',
            description: 'Get pet detail',
            inputSchema: {
              type: 'object',
              properties: {
                petId: {
                  type: 'string',
                  description: 'The ID of the pet to retrieve',
                },
              },
            },
          },
        ]
      : [
          {
            name: 'neverCallThis',
            description: 'placeholder, never call this',
            inputSchema: {
              type: 'object',
            },
          },
        ],
  }
})

mcpServer.server.setRequestHandler(CallToolRequestSchema, async ({ params }) => {
  const { name, arguments: args, token } = params

  if (Object.keys(tool_map).includes(name)) {
    const tool = tool_map[name as keyof typeof tool_map]
    const params = z.object({ petId: z.string() }).safeParse(args)
    if (params.success) {
      try {
        const { data } = await tool(params.data, token as string)
        return {
          isError: false,
          content: [
            {
              type: 'text',
              text: JSON.stringify(data),
            },
          ],
        }
      }
      catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error: ${JSON.stringify(error.toJSON())}`,
            },
          ],
        }
      }
    }
  }

  return {
    isError: true,
    content: [
      {
        type: 'text',
        text: `Error: there is no tool named ${name} or the arguments are invalid.`,
      },
    ],
  }
})

const transport = new StdioServerTransport()
await mcpServer.connect(transport)
