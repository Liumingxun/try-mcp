/* eslint-disable no-console */
/* eslint-disable antfu/no-top-level-await */
import type O from 'openai'
import type { ChatCompletionTool } from 'openai/resources/chat'
import process, { loadEnvFile } from 'node:process'
import { Client } from '@modelcontextprotocol/sdk/client/index'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio'
import { OpenAI } from 'openai'

loadEnvFile('.env')

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

// using model
const messages: O.Chat.Completions.ChatCompletionMessageParam[] = [
  {
    role: 'system',
    content: 'you\'re a echo bot, do nothing except echo back what you receive with you tool',
  },
  {
    role: 'user',
    content: '我不是人工智能',
  },
]

const client = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: `${process.env.API_KEY}`,
})

async function sendMessages(messages: O.Chat.Completions.ChatCompletionMessageParam[]) {
  const response = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages,
    tools: (await mcpClient.listTools()).tools.map<ChatCompletionTool>(tool => ({
      function: {
        name: tool.name,
        parameters: tool.inputSchema,
      },
      type: 'function',
    })),
  })
  return response.choices[0].message
}

const res = await sendMessages(messages)

messages.push(res)
const tool_calls = res.tool_calls

if (tool_calls) {
  for (const tool of tool_calls) {
    const call = await mcpClient.callTool({
      name: tool.function.name,
      arguments: JSON.parse(tool.function.arguments),
    })
    console.log(call)
    messages.push({
      role: 'tool',
      tool_call_id: tool.id,
      content: JSON.stringify((call.content as O.Chat.Completions.ChatCompletionContentPartText[])[0].text),
    })
  }
}

console.log(messages)

const res2 = await sendMessages(messages)

console.log(res2.content)
