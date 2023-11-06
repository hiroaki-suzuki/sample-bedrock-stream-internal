const WebSocketServer = require('ws').Server
const http = require('http')
const {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} = require('@aws-sdk/client-bedrock-runtime')
const dotenv = require('dotenv')

dotenv.config({ path: '.env.local' })

const wss = new WebSocketServer({ port: 8080 })
const bedrockClient = new BedrockRuntimeClient({
  region: 'ap-northeast-1',
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
  },
})

wss.on('connection', ws => {
  ws.on('message', async message => {
    try {
      const prompt = `Human: ${message} Assistant:`

      const command = new InvokeModelWithResponseStreamCommand({
        modelId: 'anthropic.claude-instant-v1',
        contentType: 'application/json',
        accept: '*/*',
        body: JSON.stringify({
          prompt: prompt,
          max_tokens_to_sample: 1000,
        }),
      })

      const response = await bedrockClient.send(command).catch(err => {
        console.log(err)
      })
      console.log(response)

      const chunks = []

      for await (const event of response.body) {
        if (event.chunk && event.chunk.bytes) {
          const chunk = JSON.parse(
            Buffer.from(event.chunk.bytes).toString('utf-8'),
          )
          chunks.push(chunk.completion) // change this line
          ws.send(Buffer.from(event.chunk.bytes))
        } else if (
          event.internalServerException ||
          event.modelStreamErrorException ||
          event.throttlingException ||
          event.validationException
        ) {
          console.error(event)
          break
        }
      }
      console.log(chunks)
    } catch (e) {
      console.error(e)
    }
  })
})
