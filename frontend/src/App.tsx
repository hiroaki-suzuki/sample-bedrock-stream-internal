import './App.css'
import { Header } from './components/Header.tsx'
import { Chat } from './components/Chat.tsx'

function App() {
  return (
    <div className="mx-auto max-w-screen-lg p-4">
      <Header />
      <Chat className="mt-10" />
    </div>
  )
}

export default App
