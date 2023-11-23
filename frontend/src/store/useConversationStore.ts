import { create } from 'zustand'

export type ConversationRole = 'human' | 'assistant'

export type Message = {
  role: ConversationRole
  text: string
}

interface ConversationStore {
  messages: Message[]
  postMessage: (message: string) => Promise<void>
}

const host = location.hostname

export const useConversationStore = create<ConversationStore>()((set, get) => ({
  messages: [],
  postMessage: async message => {
    const webSocket = new WebSocket(`ws://${host}:8080`)
    webSocket.binaryType = 'arraybuffer'

    webSocket.onopen = () => {
      const currentMessages = get().messages
      const sendMessage = currentMessages.reduce((acc, cur) => {
        if (cur.role === 'human') {
          return `${acc} Human: ${cur.text}\n\n Assistant: `
        } else {
          return `${acc} ${cur.text}\n\n`
        }
      }, '')
      webSocket.send(`\n\n${sendMessage.trim()}`)
    }

    webSocket.onerror = (event: Event) => {
      webSocket.close()
      console.error(event)
    }

    const humanMessage: Message = { role: 'human', text: message }
    set(state => ({ messages: [...state.messages, humanMessage] }))

    const answer: Message = {
      role: 'assistant',
      text: '',
    }

    const currentMessages = get().messages
    webSocket.onmessage = async (event: MessageEvent) => {
      if (event.data === '') {
        return
      }

      const buffer = new Uint8Array(event.data).buffer
      const answerResponse = JSON.parse(new TextDecoder().decode(buffer))
      answer.text += answerResponse['completion']
      set(() => ({ messages: [...currentMessages, answer] }))
    }
  },
}))
