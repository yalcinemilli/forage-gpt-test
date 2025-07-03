'use client';

import React, { useEffect, useState } from 'react';

// ZAF Client Types
declare global {
  interface Window {
    ZAFClient: {
      init: () => ZAFClientInstance;
    };
  }
}

interface ZAFClientInstance {
  on: (event: string, callback: () => void) => void;
  get: (keys: string[]) => Promise<any>;
  invoke: (api: string, ...args: any[]) => Promise<any>;
}

export default function Home() {
  const [customerConversation, setCustomerConversation] = useState(``);
  const [userInstruction, setUserInstruction] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [zafClient, setZafClient] = useState<ZAFClientInstance | null>(null);
  const [ticketSubject, setTicketSubject] = useState('');
  const [customerFirstName, setCustomerFirstName] = useState('');

  useEffect(() => {
    // ZAF Client wird normalerweise über ein Script Tag geladen
    // In einer echten Zendesk App würde das automatisch verfügbar sein
    if (typeof window !== 'undefined' && window.ZAFClient) {
      initializeZAFClient();
    }
  }, []);

  function initializeZAFClient() {
    if (typeof window !== 'undefined' && window.ZAFClient) {
      const client = window.ZAFClient.init();
      setZafClient(client);
      
      client.on('app.registered', async () => {
        try {
          const ticketData = await client.get([
            'ticket.id',
            'ticket.subject',
            'ticket.description',       // Erster Kommentar (Problem-Beschreibung)
            'ticket.priority',          // z.B. Dringlichkeit
            'ticket.requester.name',    // Name des Kunden
            'ticket.requester.email',   // Email des Kunden
            'ticket.requester.language', // Sprache (falls als Feld verfügbar)
            'ticket.comments',          // Alle Kommentare der Unterhaltung
            'ticket.status',            // Status des Tickets
            'ticket.createdAt',         // Erstellungsdatum
            'ticket.updatedAt'          // Letztes Update
            // ggf. weitere Felder wie 'ticket.customField:{{id}}' für Produkt etc.
          ]);

          console.log('Vollständige Ticketdaten:', ticketData);
          
          // Speichere Betreff und Kundenname separat
          setTicketSubject(ticketData['ticket.subject'] || '');
          const fullName = ticketData['ticket.requester.name'] || '';
          const firstName = fullName.split(' ')[0]; // Nimmt ersten Teil des Namens
          setCustomerFirstName(firstName);
          
          // Automatisch komplette Kundenkonversation aus Ticketdaten erstellen
          const conversation = formatCompleteTicketData(ticketData);
          setCustomerConversation(conversation);
        } catch (error) {
          console.error('Fehler beim Laden der Ticketdaten:', error);
        }
      });
    }
  }

  function formatCompleteTicketData(ticketData: any): string {
    const subject = ticketData['ticket.subject'] || 'Kein Betreff';
    const description = ticketData['ticket.description'] || 'Keine Beschreibung';
    const customerName = ticketData['ticket.requester.name'] || 'Kunde';
    const customerEmail = ticketData['ticket.requester.email'] || '';
    const comments = ticketData['ticket.comments'] || [];
    const status = ticketData['ticket.status'] || '';
    const createdAt = ticketData['ticket.createdAt'] || '';
    
    // Beginne mit dem Betreff und der ursprünglichen Beschreibung
    let conversation = `[Betreff]\n${subject}\n\n[Ticket-Info]\n`;
    conversation += `Status: ${status}\n`;
    conversation += `Erstellt: ${createdAt}\n`;
    conversation += `Kunde: ${customerName}`;
    if (customerEmail) {
      conversation += ` (${customerEmail})`;
    }
    conversation += `\n\n[Gesamter Verlauf inkl. Namen etc.]\n`;
    
    // Füge alle Kommentare in chronologischer Reihenfolge hinzu
    if (comments && comments.length > 0) {
      comments.forEach((comment: any, index: number) => {
        const authorName = comment.author?.name || 'Unbekannt';
        const authorRole = comment.author?.role || '';
        const commentDate = comment.created_at || '';
        const commentBody = comment.value || comment.html_body || comment.plain_body || '';
        
        // Formatiere Datum lesbarer
        let formattedDate = '';
        if (commentDate) {
          try {
            formattedDate = new Date(commentDate).toLocaleString('de-DE');
          } catch (e) {
            formattedDate = commentDate;
          }
        }
        
        // Bestimme ob es der Kunde oder Support ist
        const isCustomer = authorRole === 'end-user' || 
                          comment.author?.id === ticketData['ticket.requester.id'];
        const roleLabel = isCustomer ? 'Kunde' : 'Support';
        
        // Ersten Kommentar (ursprüngliche Nachricht) speziell behandeln
        if (index === 0) {
          conversation += `${commentBody}\n\n`;
        } else {
          // Weitere Kommentare mit Zeitstempel und Autor
          conversation += `--- ${roleLabel} (${authorName}) - ${formattedDate} ---\n`;
          conversation += `${commentBody}\n\n`;
        }
      });
    } else {
      // Fallback falls keine Kommentare verfügbar sind
      conversation += `${description}\n\n`;
    }
    
    conversation += `LG\n${customerName}`;
    
    return conversation;
  }

  function formatTicketData(ticketData: any): string {
    const subject = ticketData['ticket.subject'] || 'Kein Betreff';
    const description = ticketData['ticket.description'] || 'Keine Beschreibung';
    const customerName = ticketData['ticket.requester.name'] || 'Kunde';
    
    return `[Betreff]
${subject}

[Gesamter Verlauf inkl. Namen etc.]
${description}

LG
${customerName}`;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResponse('');

    try {
      const res = await fetch('/api/gpt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: ticketSubject,
          conversation: customerConversation.trim(),
          customerFirstName: customerFirstName,
          userInstruction: userInstruction.trim()
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Fehler bei der Anfrage');
      }

      setResponse(data.response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Foràge GPT Kundenservice
        </h1>
        <p className="text-gray-600">
          Teste die automatische Kundenservice-Antwort-Generierung
        </p>
        
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>ZAF Client Status:</strong> {zafClient ? '✅ Verbunden' : '❌ Nicht verfügbar'}
          </p>
          {zafClient && (
            <div className="text-xs text-blue-600 mt-1">
              <p><strong>Betreff:</strong> {ticketSubject || 'Nicht geladen'}</p>
              <p><strong>Kunde:</strong> {customerFirstName || 'Nicht geladen'}</p>
            </div>
          )}
          {!zafClient && (
            <p className="text-xs text-blue-600 mt-1">
              ZAF Client ist nur in einer echten Zendesk App verfügbar
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <textarea
            id="instruction"
            rows={10}
            onChange={(e) => setUserInstruction(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Gib mir Anweisungen, den Verlauf kenne ich bereits"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-3 px-4 rounded-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Generiere Antwort...' : 'Antwort generieren'}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">
            <strong>Fehler:</strong> {error}
          </p>
        </div>
      )}

      {response && (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
          <h3 className="font-semibold text-gray-900 mb-2">
            Generierte Kundenservice-Antwort:
          </h3>
          <div className="whitespace-pre-wrap text-gray-700 bg-white p-3 rounded border">
            {response}
          </div>
        </div>
      )}
    </div>
  );
}
