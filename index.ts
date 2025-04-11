import type { MessageType } from './packages/client'

import process, { loadEnvFile } from 'node:process'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio'
import { createClient } from './packages/client'

loadEnvFile('.env')

const echoTransport = new StdioClientTransport({
  command: 'pnpm',
  args: ['jiti', './packages/server/index.ts'],
})

const weatherTransport = new StdioClientTransport({
  command: 'pnpm',
  args: ['jiti', './packages/server/weather.ts'],
})

const client = createClient({ mcpServers: [
  {
    name: 'echo',
    transport: echoTransport,
  },
  {
    name: 'weather',
    transport: weatherTransport,
  },
] })

const messages: MessageType[] = [
  // {role: 'system', content: 'you are a echo bot that repeats everything I say with your tool'},
]

client.connect().then(() => {
  process.stdout.write('> ')
  process.stdin.on('data', (chunk) => {
    const input = chunk.toString().trim()
    if (!input) {
      return
    }

    messages.push({
      role: 'user',
      content: input,
    })

    client.chat(messages).then((response) => {
      process.stdout.write(`< ${response.message.content}\n`)
      process.stdout.write('> ')
    }).catch((error) => {
      process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`)
    })
  })
})
