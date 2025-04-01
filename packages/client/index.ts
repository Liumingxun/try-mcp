import type { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse'
import type { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio'
import type { WebSocketClientTransport } from '@modelcontextprotocol/sdk/client/websocket'
import type O from 'openai'
import type { ChatCompletionTool } from 'openai/resources/chat'

import process from 'node:process'
import { Client } from '@modelcontextprotocol/sdk/client/index'
import { OpenAI } from 'openai'

type TransportType = WebSocketClientTransport | SSEClientTransport | StdioClientTransport

export type MessageType = O.Chat.Completions.ChatCompletionMessageParam

export function createClient({ transport }: { transport: TransportType }) {
  const _client = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: `${process.env.API_KEY}`,
  })

  const mcpClient = new Client({
    name: 'example-client',
    version: '0.0.1',
  })
  const connect = () => mcpClient.connect(transport)

  const chat = async (messages: O.Chat.Completions.ChatCompletionMessageParam[]): Promise<O.Chat.Completions.ChatCompletion.Choice> => {
    return mcpClient.listTools().then<ChatCompletionTool[]>(({ tools }) =>
      tools.map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          parameters: tool.inputSchema,
        },
      })),
    ).then((tools) => {
      return _client.chat.completions.create({
        model: 'deepseek-chat',
        messages,
        tools,
      })
    }).then(({ choices: [choice] }) => {
      messages.push(choice.message)
      if (choice.finish_reason === 'tool_calls') {
        choice.message.tool_calls!.forEach(async (tool) => {
          const call_result = await mcpClient.callTool({
            name: tool.function.name,
            arguments: JSON.parse(tool.function.arguments), // TODO: Note that the model does not always generate valid JSON, and may hallucinate parameters not defined by your function schema.
          })
          messages.push({
            role: 'tool',
            tool_call_id: tool.id,
            content: JSON.stringify(call_result.content),
          })
        })
        return chat(messages)
      }
      console.log('-1', JSON.stringify(messages, null, 2)) // TODO: replace with a logger
      return choice
    })
  }

  return {
    _client,
    connect,
    chat,
  }
}
