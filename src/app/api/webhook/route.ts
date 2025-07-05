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

async function getRequester(requesterId: string) {
  const res = await fetch(`https://${ZENDESK_SUBDOMAIN}.zendesk.com/api/v2/users/${requesterId}.json`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${ZENDESK_EMAIL}/token:${ZENDESK_TOKEN}`).toString('base64')}`,
    },
  });

  if (!res.ok) throw new Error('Fehler beim Abruf der Requester-Daten');

  const data = await res.json();
  return {
    name: data.user.name,
    email: data.user.email,
  };
}

async function analyzeIntent(comment: string, subject: string): Promise<{
  intent: 'stornierung' | 'adressänderung' | 'keine';
  order_number?: string;
  raw_response?: string;
} | null> {
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
          content: `Du bist ein Intent-Filter für unseren Kundenservice.

Deine Aufgabe:
Analysiere die Nachricht eines Kunden und erkenne seinen Wunsch. Es gibt drei mögliche Kategorien:

1. **Adressänderung** – Der Kunde möchte die Lieferadresse ändern oder hat aus Versehen eine falsche Adresse eingegeben. Es reicht, wenn er sinngemäß darum bittet, an eine andere Adresse zu liefern (z. B. "Ich habe aus Versehen an die falsche Adresse bestellt", "Bitte an Lagerweg 12 schicken", "Könnt ihr das an meine neue Adresse schicken?" etc.).

2. **Stornierung** – Der Kunde möchte seine Bestellung nicht mehr erhalten. Auch Formulierungen wie "bitte abbrechen", "nicht mehr liefern", "stornieren", "kann ich noch stornieren?" fallen darunter.

3. **keine** – Wenn weder Adressänderung noch Stornierung eindeutig oder sinngemäß erkennbar ist.

Zusätzlich: Wenn eine Bestellnummer (z. B. eine 6-stellige Zahl wie 123456) im Betreff oder in der Nachricht enthalten ist, gib diese unter „order_number“ zurück.

Antworte **ausschließlich** im folgenden JSON-Format:
{
  "intent": "stornierung" | "adressänderung" | "keine",
  "order_number": "123456" // optional, falls erkennbar
}`,
        },
        {
          role: 'user',
          content: `Betreff: ${subject.trim().replace(/\s+/g, ' ')}

Nachricht: ${comment.trim().replace(/\s+/g, ' ')}`,
        },
      ],
      temperature: 0.4,
    }),
  });

  if (!response.ok) throw new Error(`OpenAI Fehler: ${response.status}`);
  const data: OpenAIResponse = await response.json();
  try {
    const raw = data.choices[0].message.content.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { intent: 'keine', raw_response: raw };

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return { ...parsed, raw_response: raw };
    } catch (e) {
      console.error('❌ JSON parse error', e, 'Antwort war:', raw);
      return { intent: 'keine', raw_response: raw };
    }
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
  const url = `https://${ZENDESK_SUBDOMAIN}.zendesk.com/api/v2/tickets/${ticketId}/comments.json`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${ZENDESK_EMAIL}/token:${ZENDESK_TOKEN}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      body: comment,
      public: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('❌ Fehler beim Hinzufügen des internen Kommentars:', res.status, text);
    throw new Error('Kommentar konnte nicht hinzugefügt werden');
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload: ZendeskWebhook = await request.json();
    const ticket_id = Number(payload.detail?.id);
    const subject = payload.detail?.subject || 'Kein Betreff angegeben';
    const comment = payload.detail?.description || '';

    if (!ticket_id || !comment.trim() || !payload.detail.requester_id) {
      return NextResponse.json({ error: 'Ticket ID, Kommentar und Requester ID sind erforderlich' }, { status: 400 });
    }

    const { name, email } = await getRequester(payload.detail.requester_id);

    const analysis = await analyzeIntent(comment, subject);

    if (!analysis || analysis.intent === 'keine') {
      return NextResponse.json(
        { success: true, 
          intent: 'keine', 
          debug: {
            subject,
            comment,
            name,
            email,
            requester_id: payload.detail.requester_id,
            openai_response: analysis?.raw_response || 'Keine Antwort',
          },
        }
      );
    }

    const resolvedOrderNumber = analysis.order_number || 'Unbekannt';


    
    await sendLagerEmail(
      analysis.intent,
      name,
      resolvedOrderNumber,
      comment,
      subject,
      email
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
