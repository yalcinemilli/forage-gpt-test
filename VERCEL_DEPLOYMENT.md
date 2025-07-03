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
- **Cross-Origin-Problem**: Die App kann nicht direkt auf Zendesk-DOM zugreifen wegen Sicherheitsrestriktionen
- **Lösung 1**: Die App sendet PostMessage an das Parent-Window und kopiert Text in Zwischenablage
- **Lösung 2**: Lade das Auto-Insert-Script in Zendesk:
  1. Öffne die Browser-Entwicklertools in Zendesk (F12)
  2. Gehe zur Konsole
  3. Kopiere den Inhalt von `public/zendesk-auto-insert.js` und füge ihn ein
  4. Das Script hört automatisch auf PostMessages und fügt Text ein
- **Lösung 3**: Verwende Strg+V/Cmd+V zum manuellen Einfügen (Text ist automatisch in Zwischenablage)

### Funktionsweise der verschiedenen Methoden
1. **PostMessage + Auto-Script**: App sendet Nachricht → Script fügt automatisch ein
2. **Zwischenablage**: App kopiert Text automatisch → Manuelles Einfügen mit Strg+V
3. **Manueller Kopieren-Button**: Backup-Option zum erneuten Kopieren

### Script-Installation für automatische Einfügung
```javascript
// Füge diesen Code in die Zendesk-Konsole ein (F12 → Konsole):

window.addEventListener('message', function(event) {
  if (event.data.type === 'zendesk_composer_insert' && event.data.text) {
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
      if (textarea.placeholder && (
        textarea.placeholder.includes('Antwort') ||
        textarea.placeholder.includes('Reply') ||
        textarea.placeholder.includes('Comment')
      )) {
        textarea.value = event.data.text;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.focus();
        console.log('✅ Text automatisch eingefügt!');
      }
    });
  }
});
console.log('🎯 Auto-Insert Script aktiv');
```

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
