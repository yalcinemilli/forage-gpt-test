// Zendesk Browser-Script - Füge dieses in die Browser-Konsole ein, wenn die App nicht automatisch funktioniert

// Message-Listener für automatische Texteinfügung
window.addEventListener('message', function(event) {
  console.log('Message empfangen:', event.data);
  
  if (event.data.type === 'zendesk_composer_insert' && event.data.text) {
    console.log('Versuche Text einzufügen:', event.data.text);
    
    // Methode 1: Suche nach Composer-Textareas
    const textareas = document.querySelectorAll('textarea');
    let success = false;
    
    textareas.forEach(textarea => {
      // Überprüfe verschiedene Indikatoren für Composer-Felder
      const isComposer = textarea.placeholder && (
        textarea.placeholder.includes('Antwort') ||
        textarea.placeholder.includes('Reply') ||
        textarea.placeholder.includes('Comment') ||
        textarea.placeholder.includes('Nachricht') ||
        textarea.placeholder.includes('Write')
      ) || (
        textarea.className && (
          textarea.className.includes('composer') ||
          textarea.className.includes('reply') ||
          textarea.className.includes('comment')
        )
      ) || (
        textarea.id && (
          textarea.id.includes('composer') ||
          textarea.id.includes('reply') ||
          textarea.id.includes('comment')
        )
      );
      
      if (isComposer) {
        textarea.value = event.data.text;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
        textarea.focus();
        success = true;
        console.log('✅ Text erfolgreich eingefügt in:', textarea);
      }
    });
    
    // Methode 2: Suche nach contenteditable Elementen
    if (!success) {
      const editables = document.querySelectorAll('[contenteditable="true"]');
      editables.forEach(editable => {
        if (editable.className && (
          editable.className.includes('composer') ||
          editable.className.includes('reply') ||
          editable.className.includes('comment')
        )) {
          editable.textContent = event.data.text;
          editable.dispatchEvent(new Event('input', { bubbles: true }));
          editable.focus();
          success = true;
          console.log('✅ Text erfolgreich eingefügt in contenteditable:', editable);
        }
      });
    }
    
    if (success) {
      console.log('✅ Text wurde automatisch eingefügt!');
    } else {
      console.log('❌ Kein Composer-Feld gefunden. Text ist in der Zwischenablage.');
      // Als letzter Ausweg: Kopiere in Zwischenablage
      navigator.clipboard.writeText(event.data.text).then(() => {
        console.log('📋 Text in Zwischenablage kopiert - verwende Strg+V zum Einfügen');
      });
    }
  }
});

console.log('🎯 Zendesk GPT Auto-Insert Script geladen - wartet auf Nachrichten...');
