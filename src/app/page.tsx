'use client';

import React, { useState } from 'react';

export default function Home() {
  const [customerConversation, setCustomerConversation] = useState(`
[Betreff]
Defekter Reißverschluss an der Everyday Jacket

[Gesamter Verlauf inkl. Namen etc.]
Hi Foràge Team,

ich hab vor zwei Wochen die Everyday Jacket in Black bestellt – bin mega happy mit der Passform und dem Look 👌 leider ist mir jetzt aufgefallen, dass der Reißverschluss etwas hakt bzw. sich unten löst, wenn ich sie komplett zumache. Was kann man da machen?

LG
Tobias
  `);
  
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
          customerConversation: customerConversation.trim()
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
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="conversation" className="block text-sm font-medium text-gray-700 mb-2">
            Kundenkonversation
          </label>
          <textarea
            id="conversation"
            value={customerConversation}
            onChange={(e) => setCustomerConversation(e.target.value)}
            rows={10}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Gib hier die Kundenkonversation ein..."
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-3 px-4 rounded-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Generiere Antwort...' : 'Kundenservice-Antwort generieren'}
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
