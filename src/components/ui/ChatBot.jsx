import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageCircle, X, Send, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export function ChatBot() {
  const { t, i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  async function sendMessage(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    const userMsg = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          language: i18n.language,
        },
      })

      if (error) throw error

      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: t('chat.error', 'Sorry, something went wrong. Please try again.'),
      }])
    } finally {
      setLoading(false)
    }
  }

  const greeting = {
    fr: 'Bonjour ! Comment puis-je vous aider ?',
    en: 'Hi! How can I help you?',
    th: 'สวัสดีครับ! มีอะไรให้ช่วยไหมครับ?',
    es: '¡Hola! ¿Cómo puedo ayudarte?',
    ja: 'こんにちは！何かお手伝いできますか？',
    ar: 'مرحباً! كيف يمكنني مساعدتك؟',
    ru: 'Привет! Чем могу помочь?',
    zh: '你好！有什么可以帮您的？',
    hi: 'नमस्ते! मैं आपकी कैसे मदद कर सकता हूँ?',
    pt: 'Olá! Como posso ajudar?',
    de: 'Hallo! Wie kann ich Ihnen helfen?',
    id: 'Halo! Ada yang bisa saya bantu?',
    my: 'မင်္ဂလာပါ! ဘာကူညီပေးရမလဲ?',
    it: 'Ciao! Come posso aiutarti?',
  }

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-r from-golden via-sunrise to-sunset rounded-full shadow-lg hover:shadow-2xl hover:scale-110 transition-all duration-300 flex items-center justify-center cursor-pointer animate-pulse-glow"
          aria-label="Open chat"
        >
          <MessageCircle size={24} className="text-white" />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-4rem)] flex flex-col rounded-3xl shadow-2xl border border-white/20 overflow-hidden bg-white/95 backdrop-blur-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-deep via-[#16213E] to-[#0F3460]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-golden to-sunrise rounded-xl flex items-center justify-center">
                <MessageCircle size={18} className="text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">STAYLO</p>
                <p className="text-white/50 text-xs">AI Assistant</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {/* Welcome message */}
            {messages.length === 0 && (
              <div className="bg-cream rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-deep/80 max-w-[85%]">
                {greeting[i18n.language] || greeting.en}
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`rounded-2xl px-4 py-3 text-sm max-w-[85%] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-golden/90 to-sunrise/90 text-white rounded-br-sm'
                      : 'bg-cream text-deep/80 rounded-tl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-cream rounded-2xl rounded-tl-sm px-4 py-3">
                  <Loader2 size={18} className="text-golden animate-spin" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="px-4 py-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={t('chat.placeholder', 'Ask anything about STAYLO...')}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-deep placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-golden/40 focus:border-golden/40"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-10 h-10 bg-gradient-to-r from-golden to-sunrise rounded-xl flex items-center justify-center text-white disabled:opacity-40 hover:scale-105 transition-transform cursor-pointer"
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
