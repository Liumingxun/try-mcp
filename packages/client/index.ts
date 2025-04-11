import type { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse'
import type { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio'
import type { WebSocketClientTransport } from '@modelcontextprotocol/sdk/client/websocket'
import type { Tool as MCPTool } from '@modelcontextprotocol/sdk/types'
import type O from 'openai'
import type { ChatCompletionTool } from 'openai/resources/chat'
import process from 'node:process'
import { Client } from '@modelcontextprotocol/sdk/client/index'
import { OpenAI } from 'openai'

type TransportType = WebSocketClientTransport | SSEClientTransport | StdioClientTransport
interface MCPServerOptions {
  transport: TransportType
  name: string
  version?: string
}

type Tool = {
  llmTool: ChatCompletionTool
  execute: (args?: Record<string, unknown>) => ReturnType<typeof Client.prototype.callTool>
} & MCPTool

export type MessageType = O.Chat.Completions.ChatCompletionMessageParam

export function createClient({ mcpServers }: { mcpServers: MCPServerOptions[] }) {
  const _client = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: `${process.env.API_KEY}`,
  })

  const mcpClientsById = new Map<string, Client>()
  const toolSet: Tool[] = []

  const connect = () => {
    for (const { name, version = '0.0.1' } of mcpServers) {
      const mcpClient = new Client({
        name,
        version,
      })
      mcpClientsById.set(name, mcpClient)
    }
    const connections = mcpServers.map(({ name, transport }) => {
      const client = mcpClientsById.get(name)!
      return client.connect(transport)
        .then(() =>
          client.listTools(),
        )
        .then(({ tools }) => {
          tools.forEach((tool) => {
            toolSet.push({
              ...tool,
              llmTool: {
                type: 'function',
                function: {
                  name: tool.name,
                  parameters: tool.inputSchema,
                },
              } as ChatCompletionTool,
              execute: (args?: Record<string, unknown>) =>
                client.callTool({
                  name: tool.name,
                  arguments: args,
                }),
            })
          })
        })
    })

    return Promise.all(connections)
  }

  const chat = async (messages: O.Chat.Completions.ChatCompletionMessageParam[]): Promise<O.Chat.Completions.ChatCompletion.Choice> => {
    return _client.chat.completions.create({
      model: 'deepseek-chat',
      messages,
      tools: toolSet.map(ts => ts.llmTool),
    })
      .then(({ choices: [choice] }) => {
        messages.push(choice.message)
        if (choice.finish_reason === 'tool_calls') {
          const toolCalls = choice.message.tool_calls!.map((tool) => {
            const toolDef = toolSet.find(t => t.name === tool.function.name)
            if (!toolDef) {
              console.error(`Tool ${tool.function.name} not found in registered tools.`)
              return Promise.resolve() // Skip if tool not found
            }
            return toolDef.execute(JSON.parse(tool.function.arguments || '{}'))
              .then((call_result) => {
                messages.push({
                  role: 'tool',
                  tool_call_id: tool.id,
                  content: JSON.stringify(call_result.content),
                })
              })
              .catch((err) => {
                console.error(`Error executing tool ${tool.function.name}:`, err)
              })
          },
          )
          return Promise.all(toolCalls).then(() => chat(messages))
        }
        return choice
      })
  }

  return {
    _client,
    connect,
    chat,
  }
}
