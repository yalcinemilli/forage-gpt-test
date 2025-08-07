import { supabase } from '@/app/lib/supabaseClient'
import { NextRequest, NextResponse } from 'next/server'

export interface FeedbackCase {
  id: string
  created_at: string
  customer_message: string
  gpt_suggestion: string
  final_response: string
  feedback: 'positive' | 'negative' | 'neutral'
}

export interface FeedbackRequest {
  customerMessage: string
  gptSuggestion: string
  finalResponse: string
  feedback: 'positive' | 'negative' | 'neutral'
}

export interface FeedbackResponse {
  success: boolean
  error?: string
  details?: string
}

interface FeedbackRequestBody {
  customerMessage: string
  gptSuggestion: string
  finalResponse: string
  userInstruction?: string;
  feedback: 'positive' | 'negative' | 'neutral'
}

export async function POST(request: NextRequest) {
  try {
    const body: FeedbackRequestBody = await request.json()
    const { customerMessage, gptSuggestion, finalResponse, feedback } = body

    // Validierung der erforderlichen Felder
    if (!customerMessage || !gptSuggestion || !finalResponse) {
      console.error('❌ Fehlende erforderliche Felder:', body)
      return NextResponse.json(
        { error: 'Alle Felder sind erforderlich: customerMessage, gptSuggestion, finalResponse, feedback' },
        { status: 400 }
      )
    }

    // Validierung des Feedback-Werts
    const validFeedback = ['positive', 'negative', 'neutral']
    if (!validFeedback.includes(feedback)) {
      console.error('❌ Ungültiges Feedback:', feedback)
      return NextResponse.json(
        { error: 'Feedback muss eines der folgenden Werte sein: positive, negative, neutral' },
        { status: 400 }
      )
    }

    // Daten in Supabase einfügen
    const { error } = await supabase
      .from('cases')
      .insert([
        {
          customer_message: customerMessage,
          gpt_suggestion: gptSuggestion,
          final_response: finalResponse,
          feedback: feedback,
          created_at: new Date().toISOString()
        }
      ])

    if (error) {
      console.error('❌ Supabase Fehler:', error)
      return NextResponse.json(
        { error: 'Fehler beim Speichern des Feedbacks', details: error.message },
        { status: 500 }
      )
    }

    console.log('✅ Feedback erfolgreich gespeichert')
    return NextResponse.json({ success: true }, { status: 200 })

  } catch (error) {
    console.error('❌ Fehler beim Verarbeiten der Feedback-Anfrage:', error)
    return NextResponse.json(
      { error: 'Interner Server Fehler', details: error instanceof Error ? error.message : 'Unbekannter Fehler' },
      { status: 500 }
    )
  }
}

// Health Check Endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Feedback API',
    timestamp: new Date().toISOString()
  })
}