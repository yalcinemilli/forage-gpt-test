import { chatgptRequest } from '@/app/lib/openai'
import { supabase } from '@/app/lib/supabaseClient'
import { NextRequest, NextResponse } from 'next/server'
import { OpenAI } from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface GenerateRequestBody {
  customerMessage: string
}

interface SimilarCase {
  question: string
  answer: string
  similarity?: number
}

interface GenerateResponse {
  suggestion: string
  success: boolean
  error?: string
  similarCasesCount?: number
}

export async function POST(request: NextRequest): Promise<NextResponse<GenerateResponse>> {
  try {
    const body: GenerateRequestBody = await request.json()
    const { customerMessage } = body

    // Validierung der erforderlichen Felder
    if (!customerMessage || customerMessage.trim().length === 0) {
      return NextResponse.json(
        { 
          suggestion: '', 
          success: false, 
          error: 'customerMessage ist erforderlich und darf nicht leer sein' 
        },
        { status: 400 }
      )
    }

    console.log('🔍 Generiere Embedding für Nachricht:', customerMessage.substring(0, 100) + '...')

    // Embedding erstellen
    const embeddingResp = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: customerMessage,
    })

    const embedding = embeddingResp.data[0].embedding

    console.log('✅ Embedding erstellt, suche ähnliche Fälle...')

    // Ähnliche Fälle suchen
    const { data: similarCases, error: supabaseError } = await supabase.rpc('match_cases', {
      query_embedding: embedding,
      match_threshold: 0.75,
      match_count: 5,
    })

    if (supabaseError) {
      console.error('❌ Supabase RPC Fehler:', supabaseError)
      throw new Error(`Fehler beim Suchen ähnlicher Fälle: ${supabaseError.message}`)
    }

    const cases = similarCases as SimilarCase[]
    console.log(`📋 ${cases?.length || 0} ähnliche Fälle gefunden`)

    // Kontext aus ähnlichen Fällen bauen
    const examples = cases
      ?.map((c: SimilarCase) => `Früherer Fall: ${c.question}\nAntwort: ${c.answer}`)
      .join('\n\n') || ''

    // System Prompt für FORÀGE
    const systemPrompt = `Du bist ein professioneller Support-Agent von FORÀGE Clothing. 

FORÀGE ist eine Modemarke für Männer zwischen 25 und 35 Jahren, die für hochwertige Essentials, minimalistische Ästhetik und zeitlosen Stil steht.

Deine Antworten sollen:
- Locker und freundlich sein (Du-Form verwenden)
- Den FORÀGE-Stil treffen: sympathisch direkt, ruhig, kein Marketing-Sprech
- Lösungsorientiert und kulant sein
- Mit "Hi" beginnen und mit "Liebe Grüße, Dein FORÀGE Team" enden
- Komplett und 1:1 kopierbar sein (keine Kommentare oder Erklärungen)

${examples ? 'Nutze die folgenden früheren Fälle als Inspiration für ähnliche Situationen:' : ''}`

    const userPrompt = examples 
      ? `${examples}\n\nNeue Kundenanfrage: ${customerMessage}`
      : `Kundenanfrage: ${customerMessage}`

    console.log('🤖 Sende Anfrage an GPT-4...')

    // GPT-Aufruf
    const response = await chatgptRequest(systemPrompt, userPrompt);
     
    if (!response) {
      return NextResponse.json(
        { suggestion: '', success: false, error: 'Keine Antwort von OpenAI erhalten' },
        { status: 500 }
      );
    }

    const suggestion = response.choices[0]?.message?.content

    if (!suggestion) {
      throw new Error('Keine Antwort von OpenAI erhalten')
    }

    console.log('✅ GPT-Antwort erfolgreich generiert')

    return NextResponse.json({
      suggestion,
      success: true,
      similarCasesCount: cases?.length || 0,
    })

  } catch (error) {
    console.error('❌ Fehler beim Generieren der Antwort:', error)
    
    return NextResponse.json(
      {
        suggestion: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler beim Generieren der Antwort',
      },
      { status: 500 }
    )
  }
}

// Health Check Endpoint
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'ok',
    service: 'Generate API',
    timestamp: new Date().toISOString(),
    models: {
      embedding: 'text-embedding-3-small',
      completion: 'gpt-4o',
    },
  })
}