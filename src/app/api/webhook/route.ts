import { NextRequest, NextResponse } from 'next/server';

// Environment variables für Sicherheit
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || 'mg.forage-clothing.com';
const ZENDESK_EMAIL = process.env.ZENDESK_EMAIL;
const ZENDESK_TOKEN = process.env.ZENDESK_TOKEN;
const ZENDESK_SUBDOMAIN = process.env.ZENDESK_SUBDOMAIN || 'forage-clothing';
const LAGER_EMAIL = 'hey@markmaurer.de';
const FROM_EMAIL = 'support@forage-clothing.com';

interface WebhookBody {
  ticket_id?: number;
  comment?: string;
  customer_email?: string;
  customer_name?: string;
  order_number?: string;
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

async function analyzeIntent(comment: string): Promise<OpenAIIntent | null> {
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
          content: 'Du bist ein KI-Filter. Gib als JSON nur folgendes zurück: {"intent": "stornierung"}, {"intent": "adressänderung"} oder {"intent": "keine"}',
        },
        {
          role: 'user',
          content: comment,
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

async function sendLagerEmail(type: 'stornierung' | 'adressänderung', name: string, order: string, comment: string) {
  const subject = type === 'stornierung' ? `Stornierung: Bestellung ${order}` : `Adressänderung: Bestellung ${order}`;
  const text = `Hallo Team,

Der Kunde ${name} hat eine ${type === 'stornierung' ? 'Stornierung' : 'Adressänderung'} angefragt.

Bestellnummer: ${order}
Kommentar:
${comment}

Bitte um kürze Rückmeldung, ob die ${type === 'stornierung' ? 'Stornierung' : 'Adressänderung'} möglich ist.

Liebe Grüße
FORÀGE Team`;

  const body = new URLSearchParams({
    from: `FORÀGE Support <${FROM_EMAIL}>`,
    to: LAGER_EMAIL,
    subject,
    text,
  });

  const res = await fetch(`https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`, {
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
    const body: WebhookBody = await request.json();
    const { ticket_id, comment = '', customer_email, customer_name = 'Unbekannt', order_number = 'Unbekannt' } = body;

    if (!ticket_id || !comment.trim()) {
      return NextResponse.json({ error: 'Ticket ID und Kommentar sind erforderlich' }, { status: 400 });
    }

    const intent = await analyzeIntent(comment);
    if (!intent || intent.intent === 'keine') {
      return NextResponse.json({ success: true, intent: 'keine' });
    }

    await sendLagerEmail(intent.intent, customer_name, order_number, comment);
    await addZendeskComment(ticket_id, `🤖 Automatisch erkannt: ${intent.intent === 'stornierung' ? 'Stornierung' : 'Adressänderung'} angefragt.`);

    return NextResponse.json({ success: true, intent: intent.intent });
  } catch (error) {
    console.error('Fehler im Webhook:', error);
    return NextResponse.json({ error: 'Serverfehler', details: (error as Error).message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
}
