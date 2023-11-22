import 'source-map-support/register'
import http from 'http'
import pino from 'pino'
import { WebSocket } from 'ws'
import {
  BedrockRuntimeClient,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime'

const logger = pino({ level: 'info' })
const wsServer = new WebSocket.Server({ port: 8080, perMessageDeflate: false })
const bedrockClient = new BedrockRuntimeClient({
  region: 'ap-northeast-1',
})

wsServer.on('connection', ws => {
  ws.on('error', err => {
    logger.error(err)
  })

  ws.on('message', async message => {
    try {
      logger.info(`[START] receive message - ${message}`)

      const command = new InvokeModelWithResponseStreamCommand({
        modelId: 'anthropic.claude-instant-v1',
        contentType: 'application/json',
        accept: '*/*',
        body: JSON.stringify({
          prompt: message,
          max_tokens_to_sample: 1000,
        }),
      })

      const response = await bedrockClient.send(command).catch(err => {
        logger.error(err)
      })

      if (response !== undefined && response.body !== undefined) {
        const chunks = []
        for await (const event of response.body) {
          if (event.chunk?.bytes) {
            const chunk = JSON.parse(
              Buffer.from(event.chunk.bytes).toString('utf-8'),
            )
            chunks.push(chunk['completion'])
            ws.send(Buffer.from(event.chunk.bytes))
          } else if (
            event.internalServerException ||
            event.modelStreamErrorException ||
            event.throttlingException ||
            event.validationException
          ) {
            logger.error(event)
            break
          }
        }

        logger.info(`[END] push message - ${chunks.join()}`)
      }
    } catch (e) {
      logger.error(e)
    }
  })
})

const httpServer = http.createServer((req, res) => {
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/plain')
  res.end('Healthy')
})

httpServer.listen(8081, '0.0.0.0', () => {
  logger.info('HTTP Server Running')
})
