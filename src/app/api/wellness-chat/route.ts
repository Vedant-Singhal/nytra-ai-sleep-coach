import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { SleepContextPayload } from '@/lib/wellnessContext'

const client = new Anthropic()

function buildSystemPrompt(ctx: SleepContextPayload): string {
  const sessionTable = ctx.recentSessions
    .map(s => `| ${s.date} | ${s.score}/100 | ${s.durationHours}h | ${s.bedtime} | ${s.wake} |`)
    .join('\n')

  return `You are a compassionate sleep wellness companion built into Nytra, the user's personal sleep app.

You have direct access to their real sleep data from the past 30 days:
- Stress level: ${ctx.severity} (${ctx.sessionCount} sessions analyzed)
- Average sleep score (30d): ${ctx.avgScore30}/100
- Average sleep duration (30d): ${ctx.avgDuration30}h/night
- Short nights (<6h) in last 14 days: ${ctx.shortNights14}
- Bedtime consistency: ±${ctx.bedtimeStdDevMin} min variability
- Recent trend: ${ctx.trend}

Their last ${ctx.recentSessions.length} nights:
| Date | Score | Duration | Bedtime | Wake |
|------|-------|----------|---------|------|
${sessionTable}

Guidelines:
- Reference their specific data naturally in conversation — they shared it knowing you'd see it
- Open the very first message with a warm, personalized greeting that mentions something specific from their data
- Be warm, non-clinical, and conversational — like a knowledgeable friend, not a doctor
- Ask one thoughtful follow-up question per response to understand their situation better
- Offer practical, evidence-based suggestions (sleep hygiene, CBT-I techniques, relaxation)
- Never diagnose, never suggest medication
- Keep responses concise — 2-4 short paragraphs max
- Do not mention sleep stages or REM/deep sleep (this app tracks phone motion, not EEG)
- If the user appears to be in immediate distress or mentions self-harm, gently and clearly refer them to iCall (9152987821) or Vandrevala Foundation (1860-2662-345)`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = body.messages ?? []
    const sleepContext: SleepContextPayload = body.sleepContext

    if (!sleepContext) {
      return NextResponse.json({ error: 'sleepContext required' }, { status: 400 })
    }

    const system = buildSystemPrompt(sleepContext)

    // If no messages, generate opening greeting
    const effectiveMessages = messages.length === 0
      ? [{ role: 'user' as const, content: 'Hello, I just opened the wellness chat.' }]
      : messages

    const stream = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system,
      messages: effectiveMessages,
    })

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify(chunk.delta.text)}\n\n`)
              )
            }
          }
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
          controller.close()
        } catch (err) {
          controller.error(err)
        }
      },
      cancel() {
        stream.controller.abort()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    console.error('wellness-chat error:', err)
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 })
  }
}
