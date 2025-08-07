
# FORÀGE GPT – Dokumentation

## Einleitung

FORÀGE GPT ist eine moderne Next.js 15 Anwendung für den KI-gestützten Kundenservice von FORÀGE Clothing. Sie integriert OpenAI GPT-4o, Supabase, Mailgun und die Zendesk Plattform, um automatisierte, markenkonforme Antworten und Workflows für Support-Tickets zu ermöglichen.

## Features & Architektur

- **Next.js 15** mit App Router (Server & Client Components)
- **TypeScript** für strikte Typisierung
- **Tailwind CSS** für responsives, modernes Styling
- **OpenAI GPT-4o** für KI-Antworten und semantische Suche
- **Supabase** (PostgreSQL, Vektorsuche) für Logging & Feedback
- **Mailgun** für automatisierte E-Mail-Benachrichtigungen
- **Zendesk ZAF Client** für sichere Ticket-Integration
- **Mehrstufige Antwort-Einfügung** (Composer API, DOM, Copy-Fallback)
- **Umfassende Fehlerbehandlung, Logging & Security**

## Setup & lokale Entwicklung

1. **Repository klonen**
2. `.env.local` mit allen API-Keys und Secrets anlegen
3. Abhängigkeiten installieren:
   ```bash
   npm install
   ```
4. Entwicklung starten:
   ```bash
   npm run dev
   ```
5. App unter [http://localhost:3000](http://localhost:3000) öffnen

## Verzeichnisstruktur

```
src/
├── app/          # App Router, Seiten, Layouts, API-Routen
├── components/   # Wiederverwendbare React-Komponenten
├── lib/          # Hilfsfunktionen & Integrationen (OpenAI, Supabase)
└── utils/        # Weitere Hilfsfunktionen
public/           # Statische Assets, Zendesk App HTML
```

## API-Routen & Integrationen

- **/api/gpt**: Generiert Antworten mit OpenAI GPT-4o, markenkonformer System-Prompt
- **/api/generate**: Embedding-basierte Antwortgenerierung (semantische Suche)
- **/api/webhook**: Webhook für Intent-Erkennung (Stornierung, Adressänderung, Retoure), Mailgun-Benachrichtigung
- **/api/feedback**: Feedback-Speicherung in Supabase

**Integrationsmuster:**
- ZAF Client initialisiert, lädt Ticketdaten, sendet an API, fügt Antwort per Composer API/DOM/Copy ein
- Supabase für Logging, Feedback, Vektorsuche
- Mailgun für automatisierte E-Mails an Logistik

## Styling & Komponenten

- Tailwind CSS mit konsistentem Farbkonzept
- Responsive Design & Dark Mode
- Semantisches HTML, Container-Queries
- Feedback-Komponente mit Parent-Child-Callback

## Sicherheit & Performance

- Strikte Typisierung, Input-Validierung, CORS
- Environment-Variablen für alle Secrets
- React.memo, Suspense, Next.js Image-Optimierung
- Logging & Fehlerbehandlung in allen Integrationen

## Deployment & Zendesk-Integration

1. Produktion bauen:
   ```bash
   npm run build
   ```
2. `public/zendesk-app.html` in Zendesk hochladen
3. API-Endpunkte in Zendesk-App konfigurieren
4. In echter Zendesk-Umgebung testen

## Testing & Best Practices

- ZAF Client Integration in Zendesk testen
- Postman für API-Tests nutzen
- Webhook-Funktionalität mit echten Zendesk-Events validieren
- Cross-Origin-Kommunikation und Fallbacks prüfen
- Dokumentation und Typisierung aktuell halten

---

**Weitere Infos:**
- [Next.js Doku](https://nextjs.org/docs)
- [OpenAI API](https://platform.openai.com/docs)
- [Supabase](https://supabase.com/docs)
- [Mailgun](https://documentation.mailgun.com/)
- [Zendesk Apps](https://developer.zendesk.com/)
