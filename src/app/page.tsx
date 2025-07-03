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
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [insertionStatus, setInsertionStatus] = useState('');

  const [zafClient, setZafClient] = useState<ZAFClientInstance | null>(null);
  const [ticketSubject, setTicketSubject] = useState('');
  const [customerFirstName, setCustomerFirstName] = useState('');

  const initializeZAFClient = React.useCallback(() => {
    if (typeof window !== 'undefined' && window.ZAFClient) {
      try {
        const client = window.ZAFClient.init();
        setZafClient(client);
        console.log('ZAF Client initialisiert');
        
        client.on('app.registered', async () => {
          console.log('App registriert bei Zendesk');
          try {          const ticketData = await client.get([
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
            console.log('ZAF SDK geladen');
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
    conversation += `\n\n[Gesamter Verlauf inkl. Namen etc.]\n`;
    
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResponse('');
    setInsertionStatus('');

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
      
      // Wenn ZAF Client verbunden ist, füge die Antwort in das Zendesk Antwortfeld ein
      if (zafClient) {
        console.log('Versuche Text in Zendesk Composer einzufügen...');
        try {
          // Methode 1: Versuche mit textarea (Classic Agent Interface)
          await zafClient.invoke('instances.create', {
            location: 'modal',
            url: 'data:text/html;charset=utf-8,' + encodeURIComponent(`
              <script>
                window.parent.postMessage({
                  type: 'insertText',
                  text: ${JSON.stringify(data.response)}
                }, '*');
                window.close();
              </script>
            `)
          });
          
          // Fallback: Setze Text in Zwischenablage und zeige Hinweis
          await navigator.clipboard.writeText(data.response);
          console.log('Text wurde erfolgreich in Zwischenablage kopiert');
          setInsertionStatus('clipboard');
          
        } catch (zafError) {
          console.error('Fehler beim Einfügen in Zendesk:', zafError);
          
          // Methode 2: Versuche direkten Zugriff auf DOM (falls möglich)
          try {
            // Suche nach Composer-Textareas im Parent-Window
            const textareas = window.parent.document.querySelectorAll('textarea');
            let composerFound = false;
            
            textareas.forEach(textarea => {
              if (textarea.placeholder && 
                  (textarea.placeholder.includes('Antwort') || 
                   textarea.placeholder.includes('Reply') ||
                   textarea.placeholder.includes('Comment'))) {
                textarea.value = data.response;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                composerFound = true;
              }
            });
            
            if (composerFound) {
              console.log('Text wurde via DOM-Manipulation eingefügt');
              setInsertionStatus('dom-success');
            } else {
              // Fallback: Nur in Zwischenablage kopieren
              await navigator.clipboard.writeText(data.response);
              setInsertionStatus('clipboard');
            }
            
          } catch (domError) {
            console.error('DOM-Manipulation fehlgeschlagen:', domError);
            
            // Letzte Option: Nur Zwischenablage
            try {
              await navigator.clipboard.writeText(data.response);
              setInsertionStatus('clipboard');
            } catch (clipboardError) {
              console.error('Auch Zwischenablage fehlgeschlagen:', clipboardError);
              setInsertionStatus('failed');
            }
          }
        }
      } else {
        console.log('ZAF Client nicht verfügbar');
        // Kopiere zumindest in die Zwischenablage
        try {
          await navigator.clipboard.writeText(data.response);
          setInsertionStatus('clipboard');
        } catch {
          setInsertionStatus('no-client');
        }
      }
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
              <button 
                onClick={async () => {
                  if (zafClient) {
                    try {
                      // Versuche direkte DOM-Manipulation
                      const textareas = window.parent.document.querySelectorAll('textarea');
                      let composerFound = false;
                      
                      textareas.forEach(textarea => {
                        if (textarea.placeholder && 
                            (textarea.placeholder.includes('Antwort') || 
                             textarea.placeholder.includes('Reply') ||
                             textarea.placeholder.includes('Comment') ||
                             textarea.className.includes('composer') ||
                             textarea.id.includes('comment'))) {
                          textarea.value = 'Test-Text vom GPT Assistant - DOM-Methode funktioniert! 🎉';
                          textarea.dispatchEvent(new Event('input', { bubbles: true }));
                          textarea.focus();
                          composerFound = true;
                        }
                      });
                      
                      if (composerFound) {
                        console.log('✅ DOM-Test erfolgreich - Text wurde eingefügt!');
                      } else {
                        // Fallback: Kopiere in Zwischenablage
                        await navigator.clipboard.writeText('Test-Text vom GPT Assistant - Zwischenablage-Methode');
                        console.log('📋 Text in Zwischenablage kopiert - bitte manuell einfügen');
                      }
                    } catch (error) {
                      console.error('Test fehlgeschlagen:', error);
                      // Versuche Zwischenablage als Fallback
                      try {
                        await navigator.clipboard.writeText('Test-Text vom GPT Assistant - Fallback');
                        console.log('📋 Fallback: Text in Zwischenablage kopiert');
                      } catch (clipError) {
                        console.error('Auch Zwischenablage fehlgeschlagen:', clipError);
                      }
                    }
                  }
                }}
                className="mt-1 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
              >
                🧪 Test Einfügung
              </button>
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
          
          {/* Status der automatischen Einfügung */}
          {insertionStatus === 'success' && (
            <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
              ✅ Text wurde automatisch in das Zendesk Antwortfeld eingefügt
            </div>
          )}
          {insertionStatus === 'dom-success' && (
            <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
              ✅ Text wurde in das Zendesk Antwortfeld eingefügt (DOM-Methode)
            </div>
          )}
          {insertionStatus === 'clipboard' && (
            <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
              📋 Text wurde in die Zwischenablage kopiert - bitte manuell in Zendesk einfügen (Strg+V)
            </div>
          )}
          {insertionStatus === 'success-fallback' && (
            <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
              ⚠️ Text wurde mit alternativer Methode in das Zendesk Antwortfeld eingefügt
            </div>
          )}
          {insertionStatus === 'failed' && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              ❌ Automatische Einfügung fehlgeschlagen - bitte manuell kopieren und einfügen
            </div>
          )}
          {insertionStatus === 'no-client' && (
            <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
              ℹ️ ZAF Client nicht verfügbar - Text wurde in Zwischenablage kopiert
            </div>
          )}
          
          <div className="whitespace-pre-wrap text-gray-700 bg-white p-3 rounded border">
            {response}
          </div>
          
          {/* Kopieren-Button immer anzeigen als Backup */}
          <button 
            onClick={() => navigator.clipboard.writeText(response)}
            className="mt-2 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
          >
            📋 In Zwischenablage kopieren
          </button>
        </div>
      )}
    </div>
  );
}
