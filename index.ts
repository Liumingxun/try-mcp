import type { MessageType } from './packages/client'

import process, { loadEnvFile } from 'node:process'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio'
import { createClient } from './packages/client'

loadEnvFile('.env')

const echoTransport = new StdioClientTransport({
  command: 'pnpm',
  args: ['jiti', './packages/server/echo.ts'],
})

const weatherTransport = new StdioClientTransport({
  command: 'pnpm',
  args: ['jiti', './packages/server/weather.ts'],
})

const authPetStoreTransport = new StdioClientTransport({
  command: 'pnpm',
  args: ['jiti', './packages/server/auth/index.ts'],
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
  {
    name: 'auth-pet-store',
    transport: authPetStoreTransport,
  },
] })

const messages: MessageType[] = [
  { role: 'system', content: 'You SHOULD use tools to gather information; no other methods are allowed. If your tools are insufficient to resolve the issue, you SHOULD directly inform the user.' },
]

const token = process.env.TOKEN // verified | anything | undefined

client.connect(token).then(() => {
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
