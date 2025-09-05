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

  // Key mappings for shortcuts
  const keyMappings = {
    // Add to quicklist
    'alt+h': 'add-to-quicklist',
    'alt+shift+h': 'add-to-quicklist-leftmost',  // Add to leftmost position
    
    // Open quicklist popup
    'alt+o': 'open-quicklist',
    
    // Toggle back to last active tab
    'alt+b': 'toggle-back',
    
    // Jump to tabs using letters
    'alt+j': 'jump-to-tab-1',
    'alt+k': 'jump-to-tab-2', 
    'alt+l': 'jump-to-tab-3',
    'alt+;': 'jump-to-tab-4',
    'alt+\'': 'jump-to-tab-5',
  };

  function getKeyString(event) {
    const parts = [];
    
    if (event.ctrlKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    if (event.metaKey) parts.push('meta');
    
    // Use the key directly
    let key = event.key.toLowerCase();
    
    parts.push(key);
    return parts.join('+');
  }

  function handleKeydown(event) {

    const keyString = getKeyString(event);
    
    // Debug logging - remove after testing
    if (event.altKey && !event.shiftKey && !event.ctrlKey) {
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