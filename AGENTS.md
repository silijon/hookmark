# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome extension called "Hookmark" that provides Harpoon-like tab navigation for Chrome. It allows users to create a quicklist of tabs and jump between them using keyboard shortcuts, similar to the Harpoon plugin for Neovim.

## Architecture

**Chrome Extension Structure:**
- `manifest.json` - Extension manifest defining permissions, content scripts, and keyboard commands
- `background.js` - Service worker handling tab management and command execution
- `content.js` - Content script injected into all pages for enhanced keyboard shortcut handling
- `popup.html/popup.js` - Extension popup UI for managing the tab quicklist
- `icon.png` - Extension icon

**Key Components:**
- **Command System**: Dual command handling via Chrome's commands API and content script messaging
- **Storage**: Uses Chrome's local storage API to persist the quicklist across sessions  
- **Tab Management**: Tracks tab IDs, titles, and URLs in the quicklist with automatic cleanup of closed tabs

## Development Commands

This is a pure Chrome extension with no build process. Development workflow:

1. **Loading Extension**: Load unpacked extension in Chrome Developer Mode from project directory
2. **Testing**: Test functionality by using keyboard shortcuts and popup interface
3. **Debugging**: 
   - Background script: Chrome DevTools > Extensions > Service Worker
   - Content script: Console logs in page DevTools
   - Popup: Right-click popup > Inspect

## Keyboard Shortcuts

The extension supports both Chrome's built-in command API and enhanced shortcuts via content script:

**Primary Shortcuts:**
- `Alt+Shift+H` - Add current tab to quicklist
- `Alt+Shift+O` - Open quicklist popup  
- `Alt+Shift+J/K` - Jump to quicklist tabs 1/2

**Extended Shortcuts (content script):**
- `Alt+Shift+L` - Jump to tab 3
- `Alt+Shift+:` - Jump to tab 4
- Symbol shortcuts for tabs 1-9 using shifted numbers (`!@#$%^&*(`)

**Popup Navigation:**
- `j/k` or arrow keys - Navigate quicklist
- `Enter` - Jump to selected tab
- `x/X` - Remove selected tab
- `Shift+J/K` - Move tab up/down in list
- `Escape` - Close popup

## Code Patterns

- **Async/await**: All Chrome API calls use modern async/await syntax
- **Error handling**: Tab operations include try/catch for handling closed tabs
- **Event delegation**: Content script uses single keydown listener with command mapping
- **Storage operations**: Consistent pattern of get/modify/set for quicklist updates