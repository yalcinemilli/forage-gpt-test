import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || 'mg.forage-clothing.com';
const ZENDESK_EMAIL = process.env.ZENDESK_EMAIL;
const ZENDESK_TOKEN = process.env.ZENDESK_TOKEN;
const ZENDESK_SUBDOMAIN = process.env.ZENDESK_SUBDOMAIN || 'forage-clothing';
const FROM_EMAIL = 'support@forage-clothing.com';
const LAGER_EMAIL = 'hey@markmaurer.de';

interface ZendeskWebhook {
  detail: {
    id: string;
    subject?: string;
    description?: string;
    requester_id?: string;
  };
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

async function analyzeIntent(comment: string, subject: string): Promise<{ intent: 'stornierung' | 'adressänderung' | 'keine'; order_number?: string } | null> {
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
          content: `Du bist ein KI-Filter für unseren Kundenservice.

Deine Aufgabe:
- Erkenne, ob es sich um eine **Stornierungsanfrage**, eine **Adressänderung** oder keine dieser Optionen handelt.
- Eine Adressänderung liegt z. B. vor, wenn der Kunde schreibt, dass er an die falsche Adresse bestellt hat oder eine neue Adresse nennt.
- Eine Stornierung liegt vor, wenn der Kunde die Bestellung stornieren, abbrechen oder nicht mehr erhalten möchte.

Zusätzlich: Wenn eine Bestellnummer im Text oder Betreff zu finden ist (z. B. 6-stellige Zahl wie 123456), gib diese unter „order_number“ zurück.

Antworte **ausschließlich** im folgenden JSON-Format (kein Fließtext, keine Erläuterung):
{
  "intent": "stornierung" | "adressänderung" | "keine",
  "order_number": "123456" // optional, falls erkennbar
}`,
        },
        {
          role: 'user',
          content: `Betreff: ${subject}

Nachricht: ${comment}`,
        },
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) throw new Error(`OpenAI Fehler: ${response.status}`);
  const data: OpenAIResponse = await response.json();
  try {
    return JSON.parse(data.choices[0].message.content.trim());
  } catch {
    return null;
  }
}

async function sendLagerEmail(type: 'stornierung' | 'adressänderung', name: string, order: string, comment: string, subject: string, email: string) {
  const subjectLine = type === 'stornierung' ? `Stornierung: Bestellung ${order}` : `Adressänderung: Bestellung ${order}`;
  const text = `Hallo Lager-Team,

Der Kunde ${name} hat eine ${type === 'stornierung' ? 'Stornierung' : 'Adressänderung'} angefragt.

Betreff des Tickets: ${subject}
Bestellnummer: ${order}
Kunden-E-Mail: ${email}
Kommentar:
${comment}

Bitte entsprechend bearbeiten.

Liebe Grüße
Dein FORÀGE System`;

  const body = new URLSearchParams({
    from: `FORÀGE Support <${FROM_EMAIL}>`,
    to: LAGER_EMAIL,
    subject: subjectLine,
    text,
  });

  const res = await fetch(`https://api.eu.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!res.ok) throw new Error(`Mailgun Fehler: ${res.status}`);
}

async function addZendeskComment(ticketId: number, comment: string): Promise<void> {
  await fetch(`https://${ZENDESK_SUBDOMAIN}.zendesk.com/api/v2/tickets/${ticketId}.json`, {
    method: 'PUT',
    headers: {
      Authorization: `Basic ${Buffer.from(`${ZENDESK_EMAIL}:${ZENDESK_TOKEN}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ticket: {
        comment: { body: comment, public: false },
      },
    }),
  });
}

export async function POST(request: NextRequest) {
  try {
    const payload: ZendeskWebhook = await request.json();
    const ticket_id = Number(payload.detail?.id);
    const subject = payload.detail?.subject || 'Kein Betreff angegeben';
    const comment = payload.detail?.description || '';

    if (!ticket_id || !comment.trim()) {
      return NextResponse.json({ error: 'Ticket ID und Kommentar sind erforderlich' }, { status: 400 });
    }

    const analysis = await analyzeIntent(comment, subject);
    if (!analysis || analysis.intent === 'keine') {
      return NextResponse.json({ success: true, intent: 'keine' });
    }

    const resolvedOrderNumber = analysis.order_number || 'Unbekannt';

    await sendLagerEmail(
      analysis.intent,
      'Unbekannt', // Kundenname aus Webhook aktuell nicht verfügbar
      resolvedOrderNumber,
      comment,
      subject,
      'unbekannt@forage-clothing.com' // Kunden-E-Mail aus Webhook aktuell nicht verfügbar
    );

    const ticketNote = analysis.intent === 'stornierung'
  ? '🤖 Automatisch erkannt: Stornierung angefragt.'
  : '🤖 Automatisch erkannt: Adressänderung angefragt.';
await addZendeskComment(ticket_id, ticketNote);

    return NextResponse.json({ success: true, intent: analysis.intent });
  } catch (error) {
    console.error('Fehler im Webhook:', error);
    return NextResponse.json({ error: 'Serverfehler', details: (error as Error).message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
}
