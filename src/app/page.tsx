'use client';

import React, { useEffect, useState } from 'react';
import Feedback from './component/feedback';

// ZAF Client Types
declare global {
  interface Window {
    ZAFClient: {
      init: () => ZAFClientInstance;
    };
  }
}

interface TicketData {
  'ticket.id': string;
  'ticket.subject': string;
  'ticket.description': string;
  'ticket.priority': string;
  'ticket.requester.name': string;
  'ticket.requester.email': string;
  'ticket.comments': Comment[];
  'ticket.status': string;
  'ticket.createdAt': string;
  'ticket.updatedAt': string;
  'ticket.requester.id': string;
}

interface Comment {
  author?: {
    name?: string;
    role?: string;
    id?: string;
  };
  created_at?: string;
  value?: string;
  html_body?: string;
  plain_body?: string;
}

interface ZAFClientInstance {
  on: (event: string, callback: () => void) => void;
  get: (keys: string[]) => Promise<TicketData>;
  invoke: (api: string, ...args: unknown[]) => Promise<unknown>;
  set: (key: string, value: unknown) => Promise<unknown>;
}

export default function Home() {
  const [customerConversation, setCustomerConversation] = useState(``);
  const [userInstruction, setUserInstruction] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [zafClient, setZafClient] = useState<ZAFClientInstance | null>(null);
  const [ticketSubject, setTicketSubject] = useState('');
  const [customerFirstName, setCustomerFirstName] = useState('');
  const [suggestion, setSuggestion] = useState('');

  const initializeZAFClient = React.useCallback(() => {
    if (typeof window !== 'undefined' && window.ZAFClient) {
      try {
        const client = window.ZAFClient.init();
        setZafClient(client);


        client.invoke('resize', { width: '100%', height: '700px' });

        client.on('app.registered', async () => {

          try {          
            
            const ticketData = await client.get([
            'ticket.id',
            'ticket.subject',
            'ticket.description',       // Erster Kommentar (Problem-Beschreibung)
            'ticket.priority',          // z.B. Dringlichkeit
            'ticket.requester.name',    // Name des Kunden
            'ticket.requester.email',   // Email des Kunden
            'ticket.comments',          // Alle Kommentare der Unterhaltung
            'ticket.status',            // Status des Tickets
            'ticket.createdAt',         // Erstellungsdatum
            'ticket.updatedAt',         // Letztes Update
            'ticket.requester.id'       // ID des Kunden für Vergleiche
          ]);

          // Logge die Ticketdaten für Debuggingclient.invoke('comment.insertText', 'Test 1');

            
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
        
        // Zusätzliche Event-Listener für Debugging
        client.on('app.activated', () => {
          console.log('App aktiviert');
        });
        
      } catch (error) {
        console.error('Fehler bei der ZAF Client Initialisierung:', error);
      }
    }
  }, []);

  useEffect(() => {
    // Lade ZAF Client Script dynamisch, falls es nicht bereits geladen ist
    const loadZAFClient = () => {
      if (typeof window !== 'undefined') {
        if (window.ZAFClient) {
          initializeZAFClient();
          
        } else {
          // Versuche ZAF Client Script zu laden
          const script = document.createElement('script');
          script.src = 'https://static.zdassets.com/zendesk_app_framework_sdk/2.0/zaf_sdk.min.js';
          script.onload = () => {
            if (window.ZAFClient) {
              initializeZAFClient();
            }
          };
          script.onerror = () => {
            console.log('ZAF SDK konnte nicht geladen werden - App läuft außerhalb von Zendesk');
          };
          document.head.appendChild(script);
        }
      }
    };

    loadZAFClient();
  }, [initializeZAFClient]);

  function formatCompleteTicketData(ticketData: TicketData): string {
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
    
    // Füge alle Kommentare in chronologischer Reihenfolge hinzu
    if (comments && comments.length > 0) {
      comments.forEach((comment: Comment, index: number) => {
        const authorName = comment.author?.name || 'Unbekannt';
        const authorRole = comment.author?.role || '';
        const commentDate = comment.created_at || '';
        const commentBody = comment.value || comment.html_body || comment.plain_body || '';
        
        // Formatiere Datum lesbarer
        let formattedDate = '';
        if (commentDate) {
          try {
            formattedDate = new Date(commentDate).toLocaleString('de-DE');
          } catch {
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

  function formatAsHtmlBreaks(text: string): string {
  return text
    .replace(/\n\n/g, '<br><br>') // Absätze
    .replace(/\n/g, '<br>');      // einfache Zeilenumbrüche
}

function addAnswerToZAF(answer: string): void {
  if (zafClient) {
    zafClient.invoke('ticket.comment.appendHtml', formatAsHtmlBreaks(answer))
      .then(() => {
        console.log('Antwort erfolgreich hinzugefügt');
      })
      .catch((error: Error) => {
        console.error('Fehler beim Hinzufügen der Antwort:', error);
        // Fallback: Kopiere die Antwort in die Zwischenablage
        navigator.clipboard.writeText(answer)
          .then(() => {
            console.log('Antwort in die Zwischenablage kopiert');
          })
          .catch((clipboardError: Error) => {
            console.error('Fehler beim Kopieren in die Zwischenablage:', clipboardError);
          });
      });
  } else {
    console.log('ZAF Client nicht verfügbar, kopiere Antwort in die Zwischenablage');
    navigator.clipboard.writeText(answer)

    .then(() => {
        console.log('Antwort in die Zwischenablage kopiert');
      })
      .catch((clipboardError: Error) => {
        console.error('Fehler beim Kopieren in die Zwischenablage:', clipboardError);
      });
  }
}

const handleFeedback = (finalSuggestion: string) => {
 console.log('Feedback erhalten:', finalSuggestion);
  addAnswerToZAF(finalSuggestion);
}

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

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

      setSuggestion(data.response);
      
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen p-4 space-y-6">  
      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <div className="w-full">
          <textarea
            id="instruction"
            rows={4}
            onChange={(e) => setUserInstruction(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Gib mir Anweisungen, den Verlauf kenne ich bereits"
            
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

      {suggestion && (
        <Feedback finalSuggestion={handleFeedback} suggestion={suggestion} customerConversation={customerConversation} userInstruction={userInstruction} />
        )}

        
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">
            <strong>Fehler:</strong> {error}
          </p>
        </div>
      )}

    </div>
  );
}
