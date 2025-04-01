import type { MessageType } from './packages/client'

import process, { loadEnvFile } from 'node:process'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio'
import { createClient } from './packages/client'

loadEnvFile('.env')

const transport = new StdioClientTransport({
  command: 'pnpm',
  args: ['jiti', './packages/server/index.ts'],
})
const client = createClient({ transport })

client.connect().then(() => {
  process.stdout.write('> ')
  process.stdin.on('data', (chunk) => {
    const input = chunk.toString().trim()
    if (!input) {
      return
    }

    const messages: MessageType[] = [
      {
        role: 'system',
        content: 'you\'re a echo bot, you must echo back what you receive with you tool',
      },
      {
        role: 'user',
        content: input,
      },
    ]

    client.chat(messages).then((response) => {
      process.stdout.write(`< ${response.message.content}\n`)
      process.stdout.write('> ')
    }).catch((error) => {
      process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`)
    })
  })
})
