import { NextRequest, NextResponse } from 'next/server';

// Environment variables für Sicherheit
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || 'mg.forage-clothing.com';
const ZENDESK_EMAIL = process.env.ZENDESK_EMAIL;
const ZENDESK_TOKEN = process.env.ZENDESK_TOKEN;
const ZENDESK_SUBDOMAIN = process.env.ZENDESK_SUBDOMAIN || 'forage-clothing';

const FROM_EMAIL = 'support@forage-clothing.com';

// TypeScript Interfaces
interface WebhookBody {
  ticket_id?: number;
  comment?: string;
  customer_email?: string;
}

interface OpenAIIntent {
  intent: 'stornierung' | 'adressänderung' | 'keine';
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// Utility function für OpenAI API Call
async function analyzeIntent(comment: string): Promise<OpenAIIntent | null> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API Key nicht konfiguriert');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Du bist ein KI-Filter für FORÀGE Clothing. Prüfe, ob eine Stornierung oder eine Adressänderung gewünscht wird. Antworte nur mit JSON:\n{ "intent": "stornierung" } oder { "intent": "adressänderung" } oder { "intent": "keine" }.',
        },
        {
          role: 'user',
          content: comment,
        },
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API Fehler: ${response.status}`);
  }

  const data: OpenAIResponse = await response.json();
  const intent = data.choices?.[0]?.message?.content?.trim();
  
  if (!intent) {
    return null;
  }

  try {
    return JSON.parse(intent) as OpenAIIntent;
  } catch {
    console.error('OpenAI Antwort konnte nicht als JSON geparst werden:', intent);
    return null;
  }
}

// Utility function für E-Mail versenden
async function sendCancellationEmail(customerEmail: string): Promise<void> {
  if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
    throw new Error('Mailgun Konfiguration fehlt');
  }

  const formData = new URLSearchParams({
    from: `FORÀGE Support <${FROM_EMAIL}>`,
    to: customerEmail,
    subject: 'Deine Bestellung wird storniert - FORÀGE',
    text: `Hi,

danke für deine Nachricht. Wir bestätigen dir hiermit die Stornierung deiner Bestellung. 

Falls du Fragen hast oder dir etwas anderes gefällt, melde dich jederzeit bei uns.

Liebe Grüße
Dein FORÀGE Team

--
FORÀGE Clothing
support@forage-clothing.com`,
  });

  const response = await fetch(`https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Mailgun Fehler: ${response.status}`);
  }
}

// Utility function für Zendesk Kommentar
async function addZendeskComment(ticketId: number, comment: string): Promise<void> {
  if (!ZENDESK_EMAIL || !ZENDESK_TOKEN || !ZENDESK_SUBDOMAIN) {
    throw new Error('Zendesk Konfiguration fehlt');
  }

  const response = await fetch(
    `https://${ZENDESK_SUBDOMAIN}.zendesk.com/api/v2/tickets/${ticketId}.json`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${ZENDESK_EMAIL}:${ZENDESK_TOKEN}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ticket: {
          comment: {
            body: comment,
            public: false,
          },
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Zendesk API Fehler: ${response.status}`);
  }
}

// Main POST handler
export async function POST(request: NextRequest) {
  try {
    const body: WebhookBody = await request.json();
    const { ticket_id: ticketId, comment = '', customer_email } = body;

    // Validierung
    if (!ticketId || !comment.trim()) {
      return NextResponse.json(
        { error: 'Ticket ID und Kommentar sind erforderlich' },
        { status: 400 }
      );
    }

    console.log(`Webhook empfangen für Ticket ${ticketId}`);

    // 1. OpenAI-Analyse
    const intentResult = await analyzeIntent(comment);
    
    if (!intentResult) {
      return NextResponse.json(
        { error: 'Intent konnte nicht ermittelt werden' },
        { status: 500 }
      );
    }

    console.log(`Intent erkannt: ${intentResult.intent}`);

    // 2. Bei Stornierung → Aktionen ausführen
    if (intentResult.intent === 'stornierung') {
      // E-Mail senden (falls Kunden-E-Mail verfügbar)
      if (customer_email) {
        try {
          await sendCancellationEmail(customer_email);
          console.log(`Stornierungsmail an ${customer_email} versendet`);
        } catch (error) {
          console.error('Fehler beim E-Mail versenden:', error);
          // Nicht kritisch - Prozess fortsetzen
        }
      }

      // Zendesk Kommentar hinzufügen
      try {
        await addZendeskComment(
          ticketId,
          `🤖 Automatische Erkennung: Kunde möchte Stornierung
          
${customer_email ? `✅ Bestätigungsmail wurde an ${customer_email} versendet` : '⚠️ Keine Kunden-E-Mail verfügbar - manuelle Bearbeitung erforderlich'}

Original Kommentar: "${comment}"`
        );
        console.log(`Kommentar zu Ticket ${ticketId} hinzugefügt`);
      } catch (error) {
        console.error('Fehler beim Zendesk Kommentar:', error);
      }
    } else if (intentResult.intent === 'adressänderung') {
      // Zendesk Kommentar für Adressänderung
      try {
        await addZendeskComment(
          ticketId,
          `🤖 Automatische Erkennung: Kunde möchte Adressänderung
          
⚠️ Bitte Adresse manuell prüfen und aktualisieren

Original Kommentar: "${comment}"`
        );
        console.log(`Adressänderungs-Kommentar zu Ticket ${ticketId} hinzugefügt`);
      } catch (error) {
        console.error('Fehler beim Zendesk Kommentar:', error);
      }
    }

    return NextResponse.json({ 
      success: true, 
      intent: intentResult.intent,
      actions_taken: intentResult.intent !== 'keine' ? ['zendesk_comment'] : []
    });

  } catch (error) {
    console.error('Webhook Fehler:', error);
    return NextResponse.json(
      { error: 'Interner Server Fehler', details: error instanceof Error ? error.message : 'Unbekannter Fehler' },
      { status: 500 }
    );
  }
}

// Für Health Check
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    service: 'FORÀGE Webhook Handler',
    timestamp: new Date().toISOString()
  });
}