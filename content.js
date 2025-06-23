// Content script for handling unlimited keyboard shortcuts
(function() {
  'use strict';

  console.log('Webpoon content script loaded');

  // Prevent multiple injections
  if (window.webpoonContentScript) {
    console.log('Webpoon content script already loaded, skipping');
    return;
  }
  window.webpoonContentScript = true;

  // Key mappings for shortcuts - using shifted key values
  const keyMappings = {
    // Add to quicklist
    'alt+shift+m': 'add-to-quicklist',
    
    // Open quicklist popup
    'alt+shift+o': 'open-quicklist',
    
    // Jump to tabs - original J/K/L mappings (these work because letters stay the same)
    'alt+shift+j': 'jump-to-tab-1',
    'alt+shift+k': 'jump-to-tab-2', 
    'alt+shift+l': 'jump-to-tab-3',
    
    // Jump to tabs - number mappings (shifted numbers become symbols)
    'alt+shift+!': 'jump-to-tab-1', // Shift+1
    'alt+shift+@': 'jump-to-tab-2', // Shift+2
    'alt+shift+#': 'jump-to-tab-3', // Shift+3
    'alt+shift+$': 'jump-to-tab-4', // Shift+4
    'alt+shift+%': 'jump-to-tab-5', // Shift+5
    'alt+shift+^': 'jump-to-tab-6', // Shift+6
    'alt+shift+&': 'jump-to-tab-7', // Shift+7
    'alt+shift+*': 'jump-to-tab-8', // Shift+8
    'alt+shift+(': 'jump-to-tab-9', // Shift+9
    
    // Colon (Shift+semicolon)
    'alt+shift+:': 'jump-to-tab-4'
  };

  function getKeyString(event) {
    const parts = [];
    
    if (event.ctrlKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    if (event.metaKey) parts.push('meta');
    
    // Handle special keys
    let key = event.key.toLowerCase();
    if (key === ';') key = ';';
    if (key === ':') key = ':';
    
    parts.push(key);
    return parts.join('+');
  }

  function handleKeydown(event) {
    // Don't trigger in form elements
    if (['input', 'textarea', 'select'].includes(event.target.tagName.toLowerCase())) {
      return;
    }
    
    // Don't trigger if user is typing in contenteditable
    if (event.target.contentEditable === 'true') {
      return;
    }

    const keyString = getKeyString(event);
    
    // Debug logging - remove after testing
    if (event.altKey && event.shiftKey) {
      console.log('Webpoon debug:', {
        keyString,
        key: event.key,
        code: event.code,
        command: keyMappings[keyString]
      });
    }
    
    const command = keyMappings[keyString];
    
    if (command) {
      event.preventDefault();
      event.stopPropagation();
      
      console.log('Webpoon executing command:', command);
      
      // Send message to background script
      chrome.runtime.sendMessage({
        action: 'executeCommand',
        command: command
      });
    }
  }

  // Add event listener
  document.addEventListener('keydown', handleKeydown, true);
})();