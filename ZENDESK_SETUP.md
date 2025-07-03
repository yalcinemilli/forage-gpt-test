# Zendesk App Setup

## Lokale Entwicklung

1. **Next.js Server starten**:
   ```bash
   npm run dev
   ```

2. **OpenAI API Key konfigurieren**:
   Bearbeite `.env.local` und setze deinen API Key:
   ```
   OPENAI_API_KEY=dein_api_key_hier
   ```

3. **App im Browser testen**:
   - Öffne http://localhost:3000
   - Teste die GPT API mit dem Beispiel-Text

## Zendesk Integration

### Voraussetzungen
- Zendesk CLI installiert: ``
- Zendesk Developer Account

### Setup Schritte

1. **Zendesk App Ordner erstellen**:
   ```bash
   mkdir forage-gpt-zendesk-app
   cd forage-gpt-zendesk-app
   ```

2. **Dateien kopieren**:
   ```bash
   cp ../public/manifest.json .
   mkdir assets
   cp ../public/zendesk-app.html assets/
   ```

3. **App validieren**:
   ```bash
   zcli apps:validate
   ```

4. **App hochladen**:
   ```bash
   zcli apps:create
   ```

5. **In Zendesk installieren**:
   - Gehe zu Admin → Apps und Integrationen → Apps → Private Apps
   - Finde deine App und installiere sie
   - Konfiguriere den API Endpoint (z.B. `https://your-domain.com`)

### Konfiguration

In den App-Einstellungen musst du folgende Parameter setzen:
- **API Endpoint**: Die URL zu deiner Next.js App (z.B. `https://your-domain.com`)
- **OpenAI Model**: Standard ist `gpt-4o`

### Nutzung

1. Öffne ein Support-Ticket in Zendesk
2. Die Foràge GPT App erscheint in der rechten Sidebar
3. Klicke "Antwort generieren" um eine automatische Kundenservice-Antwort zu erstellen
4. Die Antwort kann kopiert und als Antwort gesendet werden

## API Endpoints

### POST /api/gpt
Generiert eine Kundenservice-Antwort basierend auf der Kundenkonversation.

**Request Body**:
```json
{
  "customerConversation": "string - Die komplette Kundenkonversation"
}
```

**Response**:
```json
{
  "response": "string - Die generierte Antwort",
  "success": true
}
```

## Deployment

### Vercel
1. Pushe den Code zu GitHub
2. Verbinde das Repository mit Vercel
3. Setze die Umgebungsvariablen in Vercel:
   - `OPENAI_API_KEY`
4. Deploy die App

### Andere Plattformen
Die App kann auf jeder Node.js-kompatiblen Plattform deployed werden (Railway, Render, etc.).
