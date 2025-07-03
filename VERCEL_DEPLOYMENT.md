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
- **Wichtig**: Die `composer.text` API funktioniert nur im neuen Agent Workspace, nicht im Classic Interface
- Die App verwendet automatisch Fallback-Methoden:
  1. DOM-Manipulation: Sucht nach Composer-Textareas und fügt Text direkt ein
  2. Zwischenablage: Kopiert Text automatisch, du musst dann Strg+V drücken
- Verwende den "🧪 Test Einfügung" Button um zu prüfen, welche Methode funktioniert
- Überprüfe die Browser-Konsole für detaillierte Meldungen

### Classic vs. New Agent Workspace
- **Classic Agent Interface**: Automatische Einfügung via DOM-Manipulation oder Zwischenablage
- **New Agent Workspace**: Direkte API-Unterstützung (falls verfügbar)
- Die App erkennt automatisch, welche Methode verwendet werden kann

### API-Fehler
- Überprüfe, ob OPENAI_API_KEY korrekt in Vercel gesetzt ist
- Teste die API direkt über die Browser-Konsole

## Debugging
- Öffne die Browser-Entwicklertools (F12)
- Schaue in die Konsole für Meldungen vom ZAF Client
- Häufige Meldungen:
  - `✅ DOM-Test erfolgreich` = DOM-Manipulation funktioniert
  - `📋 Text in Zwischenablage kopiert` = Verwende Strg+V
  - `Could not find handler for: "composer.text"` = Normal im Classic Interface
- Teste die verschiedenen Einfüge-Methoden:
  ```javascript
  // Im Browser der Zendesk-App (Classic Interface):
  // DOM-Methode testen:
  document.querySelectorAll('textarea').forEach(t => {
    if (t.placeholder.includes('Antwort')) {
      t.value = 'Test';
      t.dispatchEvent(new Event('input', {bubbles: true}));
    }
  });
  ```
