# Vercel Bereitstellung für Foràge GPT Zendesk App

## Schritte zur Bereitstellung:

### 1. Vercel-Projekt einrichten
```bash
# Falls noch nicht installiert
npm i -g vercel

# Im Projektordner
vercel

# Bei der ersten Bereitstellung:
# - Set up and deploy? Yes
# - Which scope? Wähle deinen Account
# - Link to existing project? No  
# - What's your project's name? forage-gpt
# - In which directory is your code located? ./
# - Want to override settings? No
```

### 2. Umgebungsvariablen in Vercel setzen
- Gehe zu deinem Vercel Dashboard
- Wähle das Projekt "forage-gpt"
- Gehe zu Settings > Environment Variables
- Füge hinzu:
  - `OPENAI_API_KEY` = [Dein OpenAI API Key]

### 3. Zendesk App Manifest aktualisieren
- Öffne `public/manifest.json`
- Ändere die URL zu deiner Vercel-App-URL:
  ```json
  "url": "https://deine-app-name.vercel.app/"
  ```

### 4. Zendesk App installieren
1. Gehe zu Zendesk Admin Center
2. Apps und Integrationen > Apps > Zendesk Support Apps
3. Klicke "Upload private app"
4. Lade die `manifest.json` hoch
5. Folge den Anweisungen zur Installation

### 5. Testing
- Öffne ein Ticket in Zendesk
- Die App sollte im rechten Sidebar erscheinen
- Verwende den "🧪 Test Einfügung" Button um zu prüfen, ob die automatische Texteinfügung funktioniert

## Häufige Probleme:

### ZAF Client lädt nicht
- Stelle sicher, dass die App als iFrame in Zendesk lädt
- Überprüfe in den Browser-Entwicklertools auf Fehler

### Automatische Texteinfügung funktioniert nicht
- Verwende den Test-Button im Interface
- Überprüfe die Browser-Konsole auf Fehlermeldungen
- Stelle sicher, dass du das Ticket-Interface geöffnet hast (nicht nur die Ticket-Liste)

### API-Fehler
- Überprüfe, ob OPENAI_API_KEY korrekt in Vercel gesetzt ist
- Teste die API direkt über die Browser-Konsole

## Debugging
- Öffne die Browser-Entwicklertools (F12)
- Schaue in die Konsole für Meldungen vom ZAF Client
- Teste die composer.text API manuell in der Konsole:
  ```javascript
  // Im Browser der Zendesk-App:
  client.invoke('composer.text', 'Test Text');
  ```
