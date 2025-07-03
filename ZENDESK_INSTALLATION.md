# Zendesk App Installation - Schritt-für-Schritt Anleitung

## Vorbereitung

### 1. Vercel-App bereitstellen
Zuerst muss deine Next.js-App auf Vercel verfügbar sein:

```bash
# Falls Vercel CLI nicht installiert ist
npm i -g vercel

# In deinem Projektordner
vercel

# Notiere dir die URL, z.B. https://forage-gpt-xyz.vercel.app
```

### 2. Umgebungsvariablen in Vercel setzen
- Gehe zu https://vercel.com/dashboard
- Wähle dein Projekt
- Settings → Environment Variables
- Füge hinzu: `OPENAI_API_KEY` = [Dein OpenAI API Key]
- Klicke "Redeploy" nach dem Hinzufügen

## Zendesk App Installation

### Methode 1: Private App hochladen (Empfohlen)

#### Schritt 1: Manifest-Datei vorbereiten
Öffne `public/manifest.json` und stelle sicher, dass die URL korrekt ist:

```json
{
  "name": "Foràge GPT Assistant",
  "author": {
    "name": "Foràge Clothing",
    "email": "support@forage-clothing.com"
  },
  "defaultLocale": "en",
  "private": true,
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
  "version": "1.0.0",
  "frameworkVersion": "2.0"
}
```

#### Schritt 2: In Zendesk hochladen
1. **Zendesk Admin Center öffnen**: Gehe zu `https://[DEINE-SUBDOMAIN].zendesk.com/admin`
2. **Apps-Bereich navigieren**: 
   - Klicke auf "Apps und Integrationen" im linken Menü
   - Wähle "Apps" → "Zendesk Support apps"
3. **App hochladen**:
   - Klicke auf "Upload private app" (oben rechts)
   - Wähle die `manifest.json` Datei aus
   - Klicke "Upload"

#### Schritt 3: App installieren
1. Nach dem Upload siehst du die App in der Liste
2. Klicke auf "Install" neben der App
3. Gib falls nötig weitere Konfigurationsdaten ein
4. Klicke "Install app"

### Methode 2: ZCLI (falls du lokale Entwicklung machst)

Falls du ZCLI verwendest:

```bash
# ZCLI installieren (falls nicht vorhanden)
npm install @zendesk/zcli -g

# In deinem Projektordner
zcli apps:validate
zcli apps:package
zcli apps:upload
```

## App-Nutzung in Zendesk

### 1. Ticket öffnen
- Gehe zu einem beliebigen Ticket in Zendesk
- Die App sollte automatisch im rechten Sidebar erscheinen

### 2. Auto-Insert-Script installieren (für automatische Texteinfügung)
Öffne die Browser-Entwicklertools (F12) und füge diesen Code in die Konsole ein:

```javascript
// Auto-Insert Script für automatische Texteinfügung
window.addEventListener('message', function(event) {
  if (event.data.type === 'zendesk_composer_insert' && event.data.text) {
    console.log('GPT Text empfangen:', event.data.text);
    
    const textareas = document.querySelectorAll('textarea');
    let success = false;
    
    textareas.forEach(textarea => {
      if (textarea.placeholder && (
        textarea.placeholder.includes('Antwort') ||
        textarea.placeholder.includes('Reply') ||
        textarea.placeholder.includes('Comment') ||
        textarea.placeholder.includes('Nachricht')
      )) {
        textarea.value = event.data.text;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.focus();
        success = true;
        console.log('✅ Text automatisch eingefügt!');
      }
    });
    
    if (!success) {
      console.log('📋 Kein Composer gefunden - Text ist in Zwischenablage');
    }
  }
});
console.log('🎯 Foràge GPT Auto-Insert Script aktiv!');
```

### 3. App verwenden
1. **Anweisung eingeben**: Beschreibe, welche Art von Antwort du möchtest
2. **"Antwort generieren" klicken**: Die App ruft ChatGPT auf
3. **Text wird automatisch eingefügt**: 
   - Mit Auto-Script: Direkt ins Antwortfeld
   - Ohne Script: In Zwischenablage (Strg+V zum Einfügen)

## Troubleshooting

### App erscheint nicht im Sidebar
- Überprüfe, ob die App korrekt installiert ist
- Aktualisiere die Ticket-Seite (F5)
- Überprüfe die Browser-Konsole auf Fehler

### "ZAF Client nicht verfügbar"
- Stelle sicher, dass du in einem echten Ticket bist (nicht in der Ticket-Liste)
- Überprüfe, ob die App-URL korrekt in der manifest.json steht

### Text wird nicht automatisch eingefügt
- Führe das Auto-Insert-Script aus (siehe oben)
- Alternativ: Verwende Strg+V (Text ist automatisch in Zwischenablage)

### CORS-Fehler
- Stelle sicher, dass deine Vercel-App öffentlich zugänglich ist
- Überprüfe die Vercel-Logs auf Fehler

## Wichtige URLs

- **Zendesk Admin**: `https://[SUBDOMAIN].zendesk.com/admin`
- **Apps verwalten**: `https://[SUBDOMAIN].zendesk.com/admin/apps-integrations/apps/support-apps`
- **Vercel Dashboard**: `https://vercel.com/dashboard`

## Support

Falls Probleme auftreten:
1. Überprüfe die Browser-Konsole (F12)
2. Schaue in die Vercel-Logs
3. Teste die App direkt über die Vercel-URL
