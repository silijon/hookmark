// Content script for handling unlimited keyboard shortcuts
(function() {
  'use strict';

  console.log('Hookmark content script loaded');

  // Prevent multiple injections
  if (window.hookmarkContentScript) {
    console.log('Hookmark content script already loaded, skipping');
    return;
  }
  window.hookmarkContentScript = true;

  // Key mappings for shortcuts - using shifted key values
  const keyMappings = {
    // Add to quicklist
    'alt+shift+h': 'add-to-quicklist',
    
    // Open quicklist popup
    'alt+shift+o': 'open-quicklist',
    
    // Toggle back to last active tab
    'alt+shift+b': 'toggle-back',
    
    // Jump to tabs - original J/K/L mappings (these work because letters stay the same)
    'alt+shift+j': 'jump-to-tab-1',
    'alt+shift+k': 'jump-to-tab-2', 
    'alt+shift+l': 'jump-to-tab-3',
    
    // Colon (Shift+semicolon)
    'alt+shift+:': 'jump-to-tab-4',
    'alt+shift+"': 'jump-to-tab-5',

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

    const keyString = getKeyString(event);
    
    // Debug logging - remove after testing
    if (event.altKey && event.shiftKey) {
      console.log('Hookmark debug:', {
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
      
      console.log('Hookmark executing command:', command);
      
      // Send message to background script
      chrome.runtime.sendMessage({
        action: 'executeCommand',
        command: command
      });
    }
  }

  function showFlash() {
    // Create flash overlay with blue color and icon
    const flash = document.createElement('div');
    flash.id = 'hookmark-flash';
    flash.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(59, 130, 246, 0.15);
      background-image: url('${chrome.runtime.getURL('hook.png')}');
      background-repeat: no-repeat;
      background-position: center;
      background-size: 192px 192px;
      pointer-events: none;
      z-index: 999999;
      animation: hookmark-flash 0.4s ease-out;
    `;
    
    // Add CSS animation
    if (!document.getElementById('hookmark-style')) {
      const style = document.createElement('style');
      style.id = 'hookmark-style';
      style.textContent = `
        @keyframes hookmark-flash {
          0% { 
            opacity: 0;
            transform: scale(0.8);
          }
          50% { 
            opacity: 1;
            transform: scale(1);
          }
          100% { 
            opacity: 0;
            transform: scale(1.1);
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(flash);
    
    // Remove after animation
    setTimeout(() => {
      if (flash.parentNode) {
        flash.parentNode.removeChild(flash);
      }
    }, 400);
  }

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'showFlash') {
      showFlash();
      sendResponse({success: true});
    }
  });

  // Add event listener
  document.addEventListener('keydown', handleKeydown, true);
})();
