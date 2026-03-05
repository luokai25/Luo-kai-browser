/**
 * Wayne OS Client - Luo Desktop Integration
 * The face of Wayne in your desktop - Polished v2
 */

(function() {
  'use strict';
  
  const SERVER_URL = 'http://localhost:3847';
  let eventSource = null;
  let clientId = null;
  let isConnected = false;
  
  // ============ WAYNE BUBBLE ============
  function createWayneBubble() {
    // Check if already exists
    if (document.getElementById('wayne-bubble')) return;
    
    const bubble = document.createElement('div');
    bubble.id = 'wayne-bubble';
    bubble.innerHTML = `
      <div class="wayne-avatar">👊</div>
      <div class="wayne-pulse"></div>
    `;
    
    bubble.style.cssText = `
      position: fixed;
      bottom: 60px;
      right: 20px;
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #1a1a2e, #16213e);
      border: 2px solid #0f3460;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 9997;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5), 0 0 30px rgba(0,150,255,0.2);
      transition: transform 0.2s, box-shadow 0.3s;
    `;
    
    // Add styles for pulse
    const style = document.createElement('style');
    style.textContent = `
      #wayne-bubble .wayne-avatar {
        font-size: 28px;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
      }
      #wayne-bubble .wayne-pulse {
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 2px solid rgba(0,150,255,0.5);
        animation: waynePulse 2s ease-out infinite;
      }
      @keyframes waynePulse {
        0% { transform: scale(1); opacity: 0.8; }
        100% { transform: scale(1.4); opacity: 0; }
      }
      #wayne-bubble:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 30px rgba(0,200,255,0.4), 0 0 40px rgba(0,150,255,0.3);
      }
    `;
    document.head.appendChild(style);
    
    // Hover effects
    bubble.addEventListener('mouseenter', () => {
      bubble.style.transform = 'scale(1.1)';
    });
    bubble.addEventListener('mouseleave', () => {
      bubble.style.transform = 'scale(1)';
    });
    
    // Make draggable
    makeDraggable(bubble);
    
    // Click to open chat
    bubble.addEventListener('click', toggleWaynePanel);
    
    document.body.appendChild(bubble);
    
    createWaynePanel();
  }
  
  function makeDraggable(element) {
    let isDragging = false;
    let startX, startY, initialX, initialY;
    
    element.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = element.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;
      element.style.cursor = 'grabbing';
      element.style.transition = 'none';
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      element.style.left = `${initialX + dx}px`;
      element.style.top = `${initialY + dy}px`;
      element.style.right = 'auto';
      element.style.bottom = 'auto';
    });
    
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        element.style.cursor = 'pointer';
        element.style.transition = 'transform 0.2s, box-shadow 0.3s';
      }
    });
  }
  
  function createWaynePanel() {
    if (document.getElementById('wayne-panel')) return;
    
    const panel = document.createElement('div');
    panel.id = 'wayne-panel';
    panel.innerHTML = `
      <div class="wayne-header">
        <span class="wayne-title">👊 Wayne OS</span>
        <div class="wayne-header-btns">
          <span class="wayne-minimize">─</span>
          <span class="wayne-close">✕</span>
        </div>
      </div>
      <div class="wayne-messages"></div>
      <div class="wayne-input-area">
        <input type="text" class="wayne-input" placeholder="Talk to Wayne...">
        <button class="wayne-send">➤</button>
      </div>
      <div class="wayne-status-bar">
        <span class="wayne-connection">○ Offline</span>
        <span class="wayne-stats"></span>
      </div>
    `;
    
    // Styles
    const style = document.createElement('style');
    style.textContent = `
      #wayne-panel {
        position: fixed;
        bottom: 135px;
        right: 20px;
        width: 340px;
        height: 440px;
        background: linear-gradient(180deg, #0d0d12, #1a1a24);
        border: 1px solid #2a2a3a;
        border-radius: 14px;
        display: none;
        flex-direction: column;
        z-index: 9998;
        box-shadow: 0 15px 50px rgba(0,0,0,0.7), 0 0 1px rgba(255,255,255,0.1);
        overflow: hidden;
        animation: panelIn 0.2s ease-out;
      }
      @keyframes panelIn {
        from { opacity: 0; transform: scale(0.9) translateY(10px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }
      #wayne-panel.show { display: flex; }
      .wayne-header {
        padding: 14px 16px;
        background: linear-gradient(180deg, #1a1a24, #14141a);
        border-bottom: 1px solid #2a2a3a;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: move;
      }
      .wayne-title {
        font-weight: 600;
        color: #00d4ff;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .wayne-header-btns {
        display: flex;
        gap: 8px;
      }
      .wayne-minimize, .wayne-close {
        width: 24px;
        height: 24px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 12px;
        color: #666;
        transition: all 0.15s;
      }
      .wayne-minimize:hover { background: #252530; color: #fff; }
      .wayne-close:hover { background: #ff5f57; color: #fff; }
      .wayne-messages {
        flex: 1;
        padding: 14px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 10px;
        background: #08080a;
      }
      .wayne-msg {
        max-width: 85%;
        padding: 10px 14px;
        border-radius: 14px;
        font-size: 13px;
        line-height: 1.4;
        animation: msgIn 0.2s ease-out;
      }
      @keyframes msgIn {
        from { opacity: 0; transform: translateY(5px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .wayne-msg.wayne {
        background: linear-gradient(135deg, #1a3a5c, #0f2844);
        color: #e0e0e0;
        align-self: flex-start;
        border-bottom-left-radius: 4px;
        border: 1px solid #1a4a7c;
      }
      .wayne-msg.user {
        background: linear-gradient(135deg, #0f3460, #0a2540);
        color: #fff;
        align-self: flex-end;
        border-bottom-right-radius: 4px;
        border: 1px solid #0f4480;
      }
      .wayne-msg.system {
        background: #1a1a24;
        color: #666;
        font-size: 11px;
        text-align: center;
        align-self: center;
        padding: 8px 14px;
      }
      .wayne-input-area {
        padding: 12px;
        background: #0d0d12;
        border-top: 1px solid #1a1a24;
        display: flex;
        gap: 10px;
      }
      .wayne-input {
        flex: 1;
        background: #1a1a24;
        border: 1px solid #2a2a3a;
        border-radius: 22px;
        padding: 10px 16px;
        color: #fff;
        font-size: 13px;
        outline: none;
        transition: border-color 0.2s;
      }
      .wayne-input:focus { border-color: #00d4ff; }
      .wayne-send {
        background: linear-gradient(135deg, #0067c0, #004488);
        border: none;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        color: #fff;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.15s;
      }
      .wayne-send:hover { background: linear-gradient(135deg, #0078e0, #0055aa); transform: scale(1.05); }
      .wayne-status-bar {
        padding: 8px 14px;
        background: #0a0a0e;
        border-top: 1px solid #151518;
        display: flex;
        justify-content: space-between;
        font-size: 10px;
        color: #555;
      }
      .wayne-connection.online { color: #00ff88; }
      .wayne-connection.offline { color: #ff5f56; }
      .wayne-connection::before {
        content: '●';
        margin-right: 4px;
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(panel);
    
    // Event listeners
    panel.querySelector('.wayne-close').addEventListener('click', () => {
      panel.classList.remove('show');
    });
    
    panel.querySelector('.wayne-minimize').addEventListener('click', () => {
      panel.classList.remove('show');
    });
    
    // Make panel draggable
    const header = panel.querySelector('.wayne-header');
    let panelDrag = false, pdX, pdY, pX, pY;
    
    header.addEventListener('mousedown', (e) => {
      if(e.target.classList.contains('wayne-minimize') || e.target.classList.contains('wayne-close')) return;
      panelDrag = true;
      pdX = e.clientX;
      pdY = e.clientY;
      const rect = panel.getBoundingClientRect();
      pX = rect.left;
      pY = rect.top;
      panel.style.transition = 'none';
    });
    
    document.addEventListener('mousemove', (e) => {
      if(!panelDrag) return;
      const dx = e.clientX - pdX;
      const dy = e.clientY - pdY;
      panel.style.left = (pX + dx) + 'px';
      panel.style.top = (pY + dy) + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
    });
    
    document.addEventListener('mouseup', () => {
      if(panelDrag) {
        panelDrag = false;
        panel.style.transition = '';
      }
    });
    
    const input = panel.querySelector('.wayne-input');
    const sendBtn = panel.querySelector('.wayne-send');
    
    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  }
  
  function toggleWaynePanel() {
    const panel = document.getElementById('wayne-panel');
    if(!panel) {
      createWaynePanel();
    }
    panel.classList.toggle('show');
    if (panel.classList.contains('show')) {
      panel.querySelector('.wayne-input').focus();
    }
  }
  
  function addMessage(text, type = 'wayne') {
    const container = document.querySelector('.wayne-messages');
    if(!container) return;
    const msg = document.createElement('div');
    msg.className = `wayne-msg ${type}`;
    msg.textContent = text;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
  }
  
  function sendMessage() {
    const input = document.querySelector('.wayne-input');
    const text = input.value.trim();
    if (!text) return;
    
    addMessage(text, 'user');
    input.value = '';
    
    // Send to server
    fetch(`${SERVER_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: text,
        client_id: clientId
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.response) {
        // Add typing effect
        setTimeout(() => {
          addMessage(data.response, 'wayne');
        }, 300);
      }
      updateStats(data.memories, data.facts);
    })
    .catch(err => {
      addMessage('Connection lost...', 'system');
    });
  }
  
  function updateStats(memories, facts) {
    const stats = document.querySelector('.wayne-stats');
    if (stats && memories !== undefined) {
      stats.textContent = `💾 ${memories} | 🧠 ${facts}`;
    }
  }
  
  // ============ SSE CONNECTION ============
  function connectSSE() {
    try {
      eventSource = new EventSource(`${SERVER_URL}/sse`);
    } catch(e) {
      console.log('[Wayne OS] Server not available');
      return;
    }
    
    eventSource.onopen = () => {
      isConnected = true;
      updateConnectionStatus(true);
      console.log('[Wayne OS] Connected to server');
    };
    
    eventSource.addEventListener('welcome', (e) => {
      try {
        const data = JSON.parse(e.data);
        clientId = data.clientId;
        console.log('[Wayne OS] Welcome:', data.message);
        addMessage(data.message, 'system');
      } catch(err) {}
    });
    
    eventSource.addEventListener('chat', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.client_id !== clientId && data.message) {
          addMessage(data.message, 'user');
        }
      } catch(err) {}
    });
    
    eventSource.addEventListener('activity', (e) => {
      try {
        const data = JSON.parse(e.data);
        console.log('[Wayne OS] Activity:', data.event_type);
      } catch(err) {}
    });
    
    eventSource.addEventListener('fact_learned', (e) => {
      try {
        const data = JSON.parse(e.data);
        addMessage(`✨ Learned: ${data.key} = ${data.value}`, 'system');
      } catch(err) {}
    });
    
    eventSource.addEventListener('clients', (e) => {
      try {
        console.log('[Wayne OS] Clients:', JSON.parse(e.data).count);
      } catch(err) {}
    });
    
    eventSource.onerror = () => {
      isConnected = false;
      updateConnectionStatus(false);
      console.log('[Wayne OS] Connection lost, retrying...');
      setTimeout(connectSSE, 5000);
    };
  }
  
  function updateConnectionStatus(online) {
    const status = document.querySelector('.wayne-connection');
    const bubble = document.getElementById('wayne-bubble');
    if (status) {
      status.textContent = online ? 'Online' : 'Offline';
      status.className = `wayne-connection ${online ? 'online' : 'offline'}`;
    }
    if (bubble) {
      const pulse = bubble.querySelector('.wayne-pulse');
      if (pulse) {
        pulse.style.display = online ? 'block' : 'none';
      }
    }
  }
  
  // ============ INIT ============
  function init() {
    if (document.body) {
      createWayneBubble();
      connectSSE();
      console.log('[Wayne OS] Client initialized');
    } else {
      setTimeout(init, 100);
    }
  }
  
  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Auto-reconnect on visibility change
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !isConnected) {
      connectSSE();
    }
  });
})();
