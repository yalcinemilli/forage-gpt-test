# Zendesk App Setup - Aktualisierte Anleitung

## App direkt in Zendesk hochladen (Empfohlen)

### Schritt 1: Vercel App bereitstellen
```bash
# Vercel CLI installieren falls nötig
npm i -g vercel

# App bereitstellen
vercel

# Notiere dir die URL, z.B. https://forage-gpt-xyz.vercel.app
```

### Schritt 2: Manifest.json für Upload vorbereiten
Erstelle eine einfache `manifest.json` für den direkten Upload:

```json
{
  "name": "Foràge GPT Assistant",
  "author": {
    "name": "Foràge Clothing",
    "email": "support@forage-clothing.com"
  },
  "version": "1.0.0",
  "frameworkVersion": "2.0",
  "location": {
    "support": {
      "ticket_sidebar": {
        "url": "https://DEINE-VERCEL-URL.vercel.app/",
        "flexible": true,
        "size": {
          "width": "100%",
          "height": "600px"
        }
      }
    }
  },
  "defaultLocale": "en",
  "private": true
}
```

### Schritt 3: In Zendesk Admin hochladen
1. **Zendesk Admin öffnen**: 
   - Gehe zu `https://[DEINE-SUBDOMAIN].zendesk.com/admin`

2. **Zu Apps navigieren**:
   - Klicke "Apps und Integrationen" (links)
   - Wähle "Apps" → "Zendesk Support apps"

3. **Private App hochladen**:
   - Klicke "Upload private app" (oben rechts)
   - Wähle deine `manifest.json` Datei
   - Klicke "Upload"

4. **App installieren**:
   - Nach dem Upload: Klicke "Install" neben der App
   - Bestätige die Installation

## Alternative: ZCLI Probleme beheben

Falls du trotzdem ZCLI verwenden möchtest:

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

## ZCLI Troubleshooting (falls der 400 Error auftritt)

Der 400 Bad Request Error kann verschiedene Ursachen haben:

### 1. ZCLI aktualisieren
```bash
npm uninstall -g @zendesk/zcli
npm install -g @zendesk/zcli@latest
zcli --version
```

### 2. Authentication überprüfen
```bash
zcli logout
zcli login
```

### 3. Manifest.json vereinfachen
Erstelle eine minimale `manifest.json`:
```json
{
  "name": "Foràge GPT Assistant",
  "author": {
    "name": "Foràge",
    "email": "support@forage-clothing.com"
  },
  "version": "1.0.0",
  "frameworkVersion": "2.0",
  "location": {
    "support": {
      "ticket_sidebar": "assets/iframe.html"
    }
  },
  "defaultLocale": "en",
  "private": true
}
```

### 4. Assets-Ordner korrekt strukturieren
```bash
mkdir -p assets
echo '<iframe src="https://DEINE-VERCEL-URL.vercel.app/" width="100%" height="600"></iframe>' > assets/iframe.html
```

## Empfohlene Lösung: Direkter Upload

Da ZCLI oft Probleme macht, verwende den **direkten Upload** über die Zendesk Admin-Oberfläche:

1. Erstelle eine einfache `manifest.json` (siehe oben)
2. Gehe zu Zendesk Admin → Apps → "Upload private app"
3. Wähle die `manifest.json` Datei
4. Installiere die App

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
