// ==UserScript==
// @name         Gota.io Enhanced Hotkeys
// @version      1.0.0
// @description  Adds more useful and customizable hotkeys to Gota.io
// @author       Tenshi
// @match        https://gota.io/web/*
// @updateURL    https://raw.githubusercontent.com/Tnsh1/gota-enhanced-hotkeys/main/gota-enhanced-hotkeys.user.js
// @downloadURL  https://raw.githubusercontent.com/Tnsh1/gota-enhanced-hotkeys/main/gota-enhanced-hotkeys.user.js
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // =====================
    // DOM Helper Functions
    // =====================
    function getChatInput() {
        return document.getElementById('chat-input');
    }
    function getChatPanel() {
        return document.querySelector('#chat-panel');
    }
    function getCheckbox(id) {
        return document.getElementById(id);
    }
    function getSelect(id) {
        return document.getElementById(id);
    }
    function isChatInputFocused() {
        const chatInput = getChatInput();
        return chatInput && document.activeElement === chatInput;
    }
    function isAnyInputFocused() {
        const active = document.activeElement;
        return active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
    }

    // =====================
    // Hotkey Persistence
    // =====================
    function getHotkeyStorageKey(name) {
        return 'gotaio_hotkey_' + name.replace(/\s+/g, '_').toLowerCase();
    }
    function saveHotkey(name, key) {
        try {
            localStorage.setItem(getHotkeyStorageKey(name), key);
        } catch (e) {}
    }
    function loadHotkey(name) {
        try {
            return localStorage.getItem(getHotkeyStorageKey(name)) || '';
        } catch (e) { return ''; }
    }

    // =====================
    // UI Injection
    // =====================
    function addCustomHotkeysUI() {
        const hotkeysPanel = document.getElementById('main-hotkeys');
        if (!hotkeysPanel) return;
        const optionsContainer = hotkeysPanel.querySelector('.options-container');
        if (!optionsContainer) return;
        if (optionsContainer.querySelector('.custom-hotkey-row')) return; // Prevent duplicate

        const hotkeys = [
            'Auto Spawn',
            'Disable Mass Eject',
            'Hide Chat',
            'Join Party',
            'Leave Party',
            'Party Code',
            'Show Mass',
            'Show Names',
            'Show Skins'
        ];

        // --- Hotkey Row Creation ---
        hotkeys.forEach(name => {
            const row = document.createElement('div');
            row.className = 'custom-hotkey-row option-row';
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.margin = '6px 0';
            // Label
            const label = document.createElement('span');
            label.textContent = name;
            label.className = 'option-label';
            label.style.flex = '1';
            // Button
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'keybinds-btn';
            btn.textContent = '';
            Object.assign(btn.style, {
                background: '#e9e9ed', color: '#222', width: '65px', height: '20px',
                border: '1px solid #a9a9a9', borderRadius: '4px', marginLeft: '10px',
                textAlign: 'center', fontWeight: 'bold', fontFamily: 'Open Sans, Arial, sans-serif',
                fontSize: '13px', outline: 'none', cursor: 'pointer', padding: '0',
                letterSpacing: 'normal', textTransform: 'uppercase'
            });
            btn.addEventListener('mousedown', e => e.preventDefault());
            // Load saved hotkey
            let assignedKey = loadHotkey(name);
            if (assignedKey) btn.textContent = assignedKey;
            // Hotkey assignment
            btn.addEventListener('click', function() {
                btn.textContent = '';
                btn.focus();
                btn.style.background = '#d1d1d8';
                function onKeyDown(ev) {
                    ev.preventDefault();
                    if (ev.key === 'Escape') {
                        assignedKey = '';
                        btn.textContent = '';
                        saveHotkey(name, '');
                    } else {
                        assignedKey = ev.key.toUpperCase();
                        btn.textContent = assignedKey;
                        saveHotkey(name, assignedKey);
                    }
                    btn.style.background = '#e9e9ed';
                    window.removeEventListener('keydown', onKeyDown, true);
                }
                window.addEventListener('keydown', onKeyDown, true);
            });

            // --- Hotkey Logic ---
            setupHotkeyAction(name, btn);

            row.appendChild(label);
            row.appendChild(btn);
            optionsContainer.appendChild(row);
        });
    }

    // =====================
    // Hotkey Action Setup
    // =====================
    function setupHotkeyAction(name, btn) {
        // Toggle helpers
        function createToggleHotkey(onToggle, initialState) {
            let state = initialState;
            btn._toggleState = () => state;
            btn._setToggleState = val => { state = val; };
            btn._toggle = () => { state = !state; onToggle(state); };
        }
        // General keydown handler
        function addGlobalKeydown(handler) {
            window.addEventListener('keydown', function(ev) {
                if (document.activeElement === btn) return;
                if (isAnyInputFocused()) return;
                if (btn.textContent && ev.key.toUpperCase() === btn.textContent) {
                    handler(ev);
                }
            });
        }
        // --- Hotkey-specific logic ---
        switch (name) {
            case 'Auto Spawn': {
                // Always get the checkbox and sync state
                function getAutoRespawnState() {
                    const cb = getCheckbox('cAutoRespawn');
                    return cb ? !!cb.checked : false;
                }
                createToggleHotkey(state => {
                    const checkbox = getCheckbox('cAutoRespawn');
                    if (checkbox) {
                        checkbox.checked = state;
                        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }, getAutoRespawnState());
                // Listen for external changes to the checkbox and sync button state
                const autoRespawnCheckbox = getCheckbox('cAutoRespawn');
                if (autoRespawnCheckbox) {
                    autoRespawnCheckbox.addEventListener('change', function() {
                        btn._setToggleState(autoRespawnCheckbox.checked);
                    });
                }
                addGlobalKeydown(() => btn._toggle());
                break;
            }
            case 'Party Code':
                addGlobalKeydown(() => sendChatCommand('/public'));
                break;
            case 'Join Party':
                addGlobalKeydown(() => joinFromClipboard());
                break;
            case 'Leave Party':
                addGlobalKeydown(() => leaveParty());
                break;
            case 'Disable Mass Eject':
                addGlobalKeydown(() => {
                    requestIdleCallback(() => {
                        const checkbox = getCheckbox('cDisablePersistEjectMass');
                        if (checkbox) {
                            checkbox.checked = !checkbox.checked;
                            checkbox.dispatchEvent(new Event('change'));
                        }
                    });
                });
                break;
            case 'Hide Chat':
                addGlobalKeydown(() => {
                    const checkbox = getCheckbox('cHideChat');
                    if (checkbox) {
                        checkbox.checked = !checkbox.checked;
                        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });
                break;
            case 'Show Mass':
                addGlobalKeydown(() => {
                    const checkbox = getCheckbox('cShowMass');
                    if (checkbox) {
                        checkbox.checked = !checkbox.checked;
                        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });
                break;
            case 'Show Skins':
                addGlobalKeydown(() => {
                    const select = getSelect('sShowSkins');
                    if (select) {
                        const values = ['ALL', 'PARTY', 'SELF', 'NONE'];
                        let idx = values.indexOf(select.value);
                        idx = (idx + 1) % values.length;
                        select.value = values[idx];
                        select.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });
                break;
            case 'Show Names':
                addGlobalKeydown(() => {
                    const select = getSelect('sShowNames');
                    if (select) {
                        const values = ['ALL', 'PARTY', 'SELF', 'NONE'];
                        let idx = values.indexOf(select.value);
                        idx = (idx + 1) % values.length;
                        select.value = values[idx];
                        select.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });
                break;
        }
    }

    // =====================
    // Chat/Party Helpers
    // =====================
    function sendChatCommand(cmd) {
        const chatPanel = getChatPanel();
        const chatInput = getChatInput();
        if (!chatPanel || !chatInput) return;
        const wasHidden = chatPanel.style.display === 'none';
        if (wasHidden) {
            chatPanel.style.opacity = '0';
            chatPanel.style.display = 'block';
        }
        chatInput.value = cmd;
        chatInput.focus();
        chatInput.dispatchEvent(new KeyboardEvent('keyup', { keyCode: 13, which: 13 }));
        chatInput.blur();
        if (wasHidden) {
            setTimeout(() => {
                chatPanel.style.display = 'none';
                chatPanel.style.opacity = '1';
            }, 250);
        }
    }

    async function joinFromClipboard() {
        try {
            let clipboardText = '';
            if (navigator.clipboard && window.isSecureContext) {
                clipboardText = await navigator.clipboard.readText();
            } else {
                return;
            }
            if (!clipboardText) return;
            let msg = clipboardText.trim();
            let partyCode = null;
            let match = msg.match(/^([A-Za-z0-9]{5})[.,]?$/);
            if (!match) {
                match = msg.match(/(?:^|[\/. ])(?:j(?:oin)?\s+)?([A-Za-z0-9]{5})[.,]?$/i);
            }
            if (match) {
                partyCode = match[1];
            }
            if (!partyCode) return;
            sendChatCommand(`/join ${partyCode}`);
        } catch (e) {}
    }

    function leaveParty() {
        sendChatCommand('/leave');
    }

    // =====================
    // Party Code Copy Enhancement
    // =====================
    function enhancePartyCodeCopyButton() {
        function cleanPartyCode(text) {
            // Remove any /j or /join at the start, keep only '/join CODE'
            let match = text.trim().match(/^(?:\/j(?:oin)?\s+)?([A-Za-z0-9]{5})$/i);
            if (match) return `/join ${match[1]}`;
            // If already in '/join CODE' format, keep as is
            match = text.trim().match(/^\/join\s+([A-Za-z0-9]{5})$/i);
            if (match) return `/join ${match[1]}`;
            // If text contains /j or /join before code
            match = text.trim().match(/(?:\/j(?:oin)?\s+)?([A-Za-z0-9]{5})/i);
            if (match) return `/join ${match[1]}`;
            return text.trim();
        }
        function attachCopyHandler() {
            const copyBtn = document.querySelector('#popup-party-code button');
            const codeInput = document.getElementById('party-code-input');
            if (copyBtn && codeInput && !copyBtn._customCopyHandler) {
                copyBtn._customCopyHandler = true;
                copyBtn.addEventListener('click', function() {
                    const latestInput = document.getElementById('party-code-input');
                    if (latestInput && latestInput.value) {
                        const text = cleanPartyCode(latestInput.value);
                        navigator.clipboard.writeText(text);
                    }
                });
            }
        }
        attachCopyHandler();
        const obs = new MutationObserver(attachCopyHandler);
        obs.observe(document.body, { childList: true, subtree: true });
        const inputObs = new MutationObserver(() => {
            const popup = document.getElementById('popup-party-code');
            const codeInput = document.getElementById('party-code-input');
            if (popup && codeInput && popup.style.display !== 'none' && codeInput.value) {
                const text = cleanPartyCode(codeInput.value);
                navigator.clipboard.writeText(text);
            }
        });
        inputObs.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true });
    }

    // =====================
    // Main: Observe and Inject
    // =====================
    const observer = new MutationObserver(() => {
        addCustomHotkeysUI();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    addCustomHotkeysUI();
    enhancePartyCodeCopyButton();
})();
