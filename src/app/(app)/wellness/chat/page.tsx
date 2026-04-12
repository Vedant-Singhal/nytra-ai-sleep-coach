'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSessions } from '@/lib/storage'
import { buildSleepContext } from '@/lib/wellnessContext'
import type { SleepContextPayload } from '@/lib/wellnessContext'

type Message = { role: 'user' | 'assistant'; content: string }

const SUGGESTED_PROMPTS = [
  "Why do I feel tired even after a full night's sleep?",
  'How does inconsistent bedtime affect my energy?',
  'What can I do to wind down better before bed?',
]

export default function WellnessChatPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [sleepContext, setSleepContext] = useState<SleepContextPayload | null>(null)
  const [greetingDone, setGreetingDone] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const greetingFired = useRef(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const sessions = getSessions()
    const ctx = buildSleepContext(sessions)
    setSleepContext(ctx)
  }, [])

  const sendMessage = useCallback(async (text: string, existingMessages: Message[], ctx: SleepContextPayload) => {
    const userMsg: Message = { role: 'user', content: text }
    const newMessages = text ? [...existingMessages, userMsg] : existingMessages
    if (text) setMessages(prev => [...prev, userMsg])

    const assistantPlaceholder: Message = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, assistantPlaceholder])
    setStreaming(true)

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/wellness-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortRef.current.signal,
        body: JSON.stringify({ messages: newMessages, sleepContext: ctx }),
      })

      if (!res.ok || !res.body) {
        setMessages(prev => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: 'assistant', content: "I'm having trouble connecting right now. Please try again." }
          return copy
        })
        setStreaming(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const lines = decoder.decode(value, { stream: true }).split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') { setStreaming(false); break }
          try {
            const chunk = JSON.parse(data)
            setMessages(prev => {
              const copy = [...prev]
              copy[copy.length - 1] = {
                ...copy[copy.length - 1],
                content: copy[copy.length - 1].content + chunk,
              }
              return copy
            })
          } catch { /* ignore malformed chunks */ }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      setMessages(prev => {
        const copy = [...prev]
        copy[copy.length - 1] = { role: 'assistant', content: "Connection interrupted. Please try again." }
        return copy
      })
    } finally {
      setStreaming(false)
      setGreetingDone(true)
    }
  }, [])

  // Fire greeting once context is ready
  useEffect(() => {
    if (!sleepContext || greetingFired.current) return
    greetingFired.current = true
    sendMessage('', [], sleepContext)
  }, [sleepContext, sendMessage])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Abort on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  function handleSend() {
    const text = input.trim()
    if (!text || streaming || !sleepContext) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    sendMessage(text, messages, sleepContext)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px'
  }

  const aiTurns = messages.filter(m => m.role === 'assistant' && m.content.length > 0).length
  const showSuggestions = greetingDone && messages.filter(m => m.role === 'user').length === 0

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-bg-primary pb-safe" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-bg-tertiary"
        style={{ background: 'rgba(15,20,32,0.9)', backdropFilter: 'blur(12px)' }}>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-slate-400 text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
            style={{ background: 'linear-gradient(135deg, #5EEAD4 0%, #818CF8 100%)' }}>
            🧠
          </div>
          <div>
            <p className="text-slate-100 font-semibold text-sm leading-none">Nytra Companion</p>
            <p className="text-slate-500 text-[10px] mt-0.5">Powered by your Nytra sleep data</p>
          </div>
        </div>
        {streaming && (
          <div className="flex gap-1 items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-teal animate-pulse" />
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
            <div className="text-3xl">🧠</div>
            <p className="text-slate-500 text-sm">Starting your session...</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && msg.content === '' && streaming ? (
              <div className="bg-bg-secondary rounded-2xl rounded-bl-sm px-4 py-3 mr-8 flex gap-1 items-center">
                {[0, 1, 2].map(d => (
                  <span
                    key={d}
                    className="w-1.5 h-1.5 rounded-full bg-slate-500"
                    style={{ animation: `bounce 1.2s ease-in-out ${d * 0.2}s infinite` }}
                  />
                ))}
              </div>
            ) : (
              <div
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'ml-8 rounded-br-sm text-slate-100'
                    : 'mr-8 rounded-bl-sm text-slate-300 bg-bg-secondary'
                }`}
                style={msg.role === 'user' ? { background: 'rgba(94,234,212,0.15)' } : {}}
              >
                {msg.content}
              </div>
            )}
          </div>
        ))}

        {/* Escalation section */}
        {aiTurns >= 3 && (
          <div className="bg-bg-secondary rounded-2xl p-4 mt-2">
            <p className="text-slate-400 text-xs font-semibold mb-3">Want to talk to someone else?</p>
            <div className="space-y-2">
              <a
                href="https://www.feelbetterbot.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-bg-tertiary rounded-xl px-3.5 py-2.5"
              >
                <span className="text-base">🤖</span>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-300 text-xs font-medium">FeelBetter Companion (External)</p>
                  <p className="text-slate-500 text-[10px]">Anonymous AI wellness chat</p>
                </div>
                <svg className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              <a
                href="https://mentalhealth-bsw.iitd.ac.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-bg-tertiary rounded-xl px-3.5 py-2.5"
              >
                <span className="text-base">🏛</span>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-300 text-xs font-medium">IIT Delhi Wellness</p>
                  <p className="text-slate-500 text-[10px]">Real human counsellors</p>
                </div>
                <svg className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested prompts */}
      {showSuggestions && (
        <div className="px-4 pb-2">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {SUGGESTED_PROMPTS.map(p => (
              <button
                key={p}
                onClick={() => { if (sleepContext) sendMessage(p, messages, sleepContext) }}
                className="flex-shrink-0 bg-bg-secondary border border-bg-tertiary text-slate-400 text-xs rounded-xl px-3 py-2 text-left max-w-[200px]"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="sticky bottom-0 z-[210] border-t border-bg-tertiary px-4 py-3 bg-bg-secondary">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="How are you feeling about your sleep?"
            rows={1}
            className="flex-1 bg-bg-tertiary text-slate-200 placeholder-slate-600 text-sm rounded-xl px-4 py-3 resize-none outline-none leading-relaxed"
            style={{ minHeight: '44px', maxHeight: '96px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || streaming || !sleepContext}
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-30"
            style={{
              background: input.trim() && !streaming
                ? 'linear-gradient(135deg, #5EEAD4 0%, #818CF8 100%)'
                : '#1A2332',
            }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke={input.trim() && !streaming ? '#0A0D14' : '#475569'} strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-slate-700 text-center mt-2">
          Not a crisis service · iCall 9152987821 · Vandrevala 1860-2662-345
        </p>
      </div>

      <style jsx>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
