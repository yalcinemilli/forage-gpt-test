import { NextRequest, NextResponse } from 'next/server';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
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
– formatiere die Antwort mit Absätzen, d. h. setze sinnvolle Zeilenumbrüche zwischen Abschnitten (verwende doppelte Zeilenumbrüche, keine einzelnen)
- in der "wir" form sein, wir treten immer als Team auf, nicht als Einzelperson -> wir haben das Problem gesehen, wir haben das geprüft, wir haben eine Lösung gefunden etc.

Wenn ein Artikel defekt ist, dann fordern wir diesen nicht zurück. Erwähnen das aber auch nicht explizit. Wir nennen nur Lösungen und bieten keinen kostenlosen Rückversand in einem solchen Fall ein.

Wir beginnen jede Nachricht mit:

"Hi Name des Kunden,

vielen Dank für deine Nachricht (oder danke für dein Feedback etc.)"

Wir beenden jede Nachricht mit:

"Bei weiteren Fragen kannst du dich natürlich gerne jederzeit wieder an uns wenden!

Liebe Grüße
Dein FORÀGE Team"
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

    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API Key nicht konfiguriert' },
        { status: 500 }
      );
    }

    // Erstelle eine personalisierte Systemnachricht
    const enhancedSystemPrompt = `${systemPrompt}

Zusätzliche Informationen für diese Anfrage:
- Betreff des Tickets: ${subject || 'Nicht verfügbar'}
- Vorname des Kunden: ${customerFirstName || 'Nicht verfügbar'}
- Spezielle Anweisung: ${userInstruction}

Berücksichtige diese Informationen bei der Erstellung der Antwort.`;

    const messages: OpenAIMessage[] = [
      {
        role: 'system',
        content: enhancedSystemPrompt
      },
      {
        role: 'user',
        content: `Der Verlauf mit dem Kunden:\n\n${conversation}`
      }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: 'Fehler bei der OpenAI-Anfrage', details: errorData },
        { status: response.status }
      );
    }

    const data: OpenAIResponse = await response.json();
    const generatedResponse = data.choices[0]?.message?.content;

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