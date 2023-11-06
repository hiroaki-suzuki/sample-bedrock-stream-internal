import {
  ConversationRole,
  Message,
  useConversationStore,
} from '../store/useConversationStore.ts'

export function ChatMessage() {
  const messages: Message[] = useConversationStore(state => state.messages)

  return (
    <div className="h-[77vh] overflow-y-scroll">
      {messages.map((message, i) => {
        const roleColor = roleColorClass(message.role)
        const texts = message.text.split('\n\n')

        return (
          <p key={i} className={`px-5 py-3 leading-8 ${roleColor}`}>
            {texts.map(text => {
              return (
                <>
                  {text}
                  <br />
                </>
              )
            })}
          </p>
        )
      })}
    </div>
  )
}

function roleColorClass(role: ConversationRole): string {
  return role === 'assistant' ? 'bg-sky-50' : ''
}
