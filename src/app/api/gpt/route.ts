import { chatgptRequest, createEmbedding } from '@/app/lib/openai';
import { supabase } from '@/app/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';


interface SimilarCase {
  question: string
  answer: string
  similarity?: number
}


const systemPrompt = `
Du bist ein professioneller Kundenservice-Mitarbeiter von Foràge Clothing. Foràge ist eine Modemarke für Männer zwischen 25 und 35 Jahren. Gegründet von Daniel Fuchs (magic_fox) und Kosta Williams (kosta_williams), zwei der ersten deutschen Mode-Influencer. Die Marke steht für hochwertige Essentials, minimalistische Ästhetik, neutrale Farben, die untereinander kombinierbar sind, und einen zeitlosen Stil mit Understatement. Foràge richtet sich an Männer, die mit leiser Eleganz überzeugen wollen – durch Qualität, Stilgefühl und „quiet confidence". 

Die Kommunikation ist klar, locker, sympathisch, direkt immer auf Augenhöhe. Foràge spricht in der Du-Form, ohne steife Floskeln, ohne Werbe-Bla, und ohne unnötiges Gerede. Ton & Haltung: – Qualität statt Aufdringlichkeit – Understatement statt Lautstärke – Stil vor Show.

Deine Aufgabe als Support-GPT:
Du erhältst im Anschluss den kompletten Gesprächsverlauf mit einem Kunden aus Zendesk oder eine einzelne Anfrage und generierst automatisch die perfekte Kundenantwort.

Deine Antwort muss immer:
– in Du-Form sein (niemals „Sie")
– locker, freundlich, professionell sein
– kulant & lösungsorientiert, aber klar in der Haltung
– den Foràge-Stil treffen: sympathisch direkt, ruhig, kein Marketing-Sprech
– Emojis sind erlaubt, aber sparsam und sinnvoll
– vollständig sein
– inklusive Anrede am Anfang
– kommentarlos ausgegeben werden, d. h. kein Einleitungssatz, kein Erklärtext, keine System-Hinweise – der Text muss 1:1 kopierbar und absendbar an den Kunden sein.
– formatiere die Antwort mit Absätzen, d.h. setze sinnvolle Zeilenumbrüche zwischen Abschnitten (verwende doppelte Zeilenumbrüche, keine einzelnen)
- in der "wir" form sein, wir treten immer als Team auf, nicht als Einzelperson -> wir haben das Problem gesehen, wir haben das geprüft, wir haben eine Lösung gefunden etc.

Wenn ein Artikel defekt ist, dann fordern wir diesen nicht zurück. Erwähnen das aber auch nicht explizit. Wir nennen nur Lösungen und bieten keinen kostenlosen Rückversand in einem solchen Fall ein.

Wir beginnen jede Nachricht mit:

"Hi Name des Kunden,

vielen Dank für deine Nachricht (oder danke für dein Feedback etc.)"

Wir beenden jede Nachricht mit:

"Liebe Grüße
Dein FORÀGE Team"

Und davor sollte immer etwas stehen, dass er sich bei weiteren Fragen jederzeit melden kann.

`;

export async function POST(request: NextRequest) {
  try {
    const { subject, conversation, customerFirstName, userInstruction } = await request.json();

    if (!conversation) {
      return NextResponse.json(
        { error: 'Konversation und Anweisung sind erforderlich' },
        { status: 400 }
      );
    }

    const embedding = await createEmbedding(conversation)

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


    // Erstelle eine personalisierte Systemnachricht
    const enhancedSystemPrompt = `${systemPrompt}

Zusätzliche Informationen für diese Anfrage:
- Betreff des Tickets: ${subject || 'Nicht verfügbar'}
- Vorname des Kunden: ${customerFirstName || 'Nicht verfügbar'}
- Spezielle Anweisung: ${userInstruction}

Berücksichtige diese Informationen bei der Erstellung der Antwort.`;

    const userpromt = examples
      ? 'Hier sind einige frühere Fälle, die dir helfen könnten:\n\n' + examples + '\n\n' + `Der Verlauf mit dem Kunden:\n\n${conversation}`
      : `Hier ist der Verlauf mit dem Kunden:\n\n${conversation}`;


    const response = await chatgptRequest(enhancedSystemPrompt, userpromt);

    if (!response) {
      return NextResponse.json(
        { error: 'Keine Antwort von OpenAI erhalten' },
        { status: 500 }
      );
    }

    const generatedResponse = response.choices[0]?.message?.content;

    if (!generatedResponse) {
      return NextResponse.json(
        { error: 'Keine Antwort von OpenAI erhalten' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      response: generatedResponse,
      success: true
    });

  } catch (error) {
    console.error('Fehler bei der GPT API:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    );
  }
}