/**
 * Wayne OS Server v1.1
 * 100% Built-in Node.js modules - no installation needed!
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3847;
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'wayne.json');

// Generate UUID without uuid module
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ============ JSON DATABASE ============
function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('[DB] Load error:', e.message);
  }
  return {
    memory: [],
    conversations: {},
    facts: {},
    settings: {},
    activity: []
  };
}

function saveDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('[DB] Save error:', e.message);
  }
}

let db = loadDB();
let lastSave = Date.now();

setInterval(() => {
  if (Date.now() - lastSave > 5000) {
    saveDB(db);
    lastSave = Date.now();
  }
}, 5000);

// ============ SSE CLIENTS ============
let sseClients = new Set();

function broadcast(event, data) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(client => {
    client.write(message);
  });
}

// ============ HTTP SERVER ============
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  // ============ SSE ENDPOINT ============
  if (url.pathname === '/sse') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    
    const clientId = uuidv4();
    res.write(`event: welcome\ndata: ${JSON.stringify({ 
      clientId, 
      message: 'Wayne OS is online. I\'m here. Always.',
      uptime: process.uptime()
    })}\n\n`);
    
    sseClients.add(res);
    console.log(`[Wayne OS] Client connected: ${clientId}`);
    
    db.activity.push({
      id: uuidv4(),
      event_type: 'client_connected',
      data: { clientId },
      timestamp: new Date().toISOString()
    });
    
    broadcast('clients', { count: sseClients.size });
    
    req.on('close', () => {
      sseClients.delete(res);
      console.log(`[Wayne OS] Client disconnected: ${clientId}`);
      db.activity.push({
        id: uuidv4(),
        event_type: 'client_disconnected',
        data: { clientId },
        timestamp: new Date().toISOString()
      });
      broadcast('clients', { count: sseClients.size });
    });
    return;
  }
  
  // ============ REST API ============
  
  if (url.pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      uptime: process.uptime(),
      clients: sseClients.size,
      memories: db.memory.length,
      facts: Object.keys(db.facts).length,
      version: '1.1.0'
    }));
    return;
  }
  
  if (url.pathname === '/api/memory' && req.method === 'GET') {
    const limit = parseInt(url.searchParams.get('limit')) || 100;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(db.memory.slice(-limit).reverse()));
    return;
  }
  
  if (url.pathname === '/api/memory' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const { content, type = 'general', source = 'api', importance = 1 } = JSON.parse(body);
      db.memory.push({
        id: uuidv4(),
        type, content, source, importance,
        created_at: new Date().toISOString()
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    });
    return;
  }
  
  if (url.pathname === '/api/facts' && req.method === 'GET') {
    const facts = Object.entries(db.facts).map(([key, val]) => ({ key, ...val }));
    facts.sort((a, b) => b.confidence - a.confidence);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(facts));
    return;
  }
  
  if (url.pathname === '/api/fact' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const { key, value, confidence = 1.0 } = JSON.parse(body);
      db.facts[key] = { value, confidence, updated_at: new Date().toISOString() };
      broadcast('fact_learned', { key, value });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    });
    return;
  }
  
  if (url.pathname === '/api/activity' && req.method === 'GET') {
    const limit = parseInt(url.searchParams.get('limit')) || 50;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(db.activity.slice(-limit).reverse()));
    return;
  }
  
  if (url.pathname === '/api/activity' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const { event_type, data } = JSON.parse(body);
      db.activity.push({
        id: uuidv4(),
        event_type, data,
        timestamp: new Date().toISOString()
      });
      if (db.activity.length > 1000) db.activity = db.activity.slice(-1000);
      broadcast('activity', { event_type, data, timestamp: new Date().toISOString() });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    });
    return;
  }
  
  if (url.pathname === '/api/conversation' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const { client_id, messages } = JSON.parse(body);
      db.conversations[client_id] = { messages, updated_at: new Date().toISOString() };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    });
    return;
  }
  
  if (url.pathname.startsWith('/api/conversation/') && req.method === 'GET') {
    const clientId = url.pathname.split('/').pop();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(db.conversations[clientId] || { messages: '[]' }));
    return;
  }
  
  // Chat endpoint
  if (url.pathname === '/api/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const { message, client_id } = JSON.parse(body);
      
      // Store in memory
      db.memory.push({
        id: uuidv4(),
        type: 'conversation',
        content: message,
        source: 'luo-desktop',
        importance: 2,
        created_at: new Date().toISOString()
      });
      
      // Log activity
      db.activity.push({
        id: uuidv4(),
        event_type: 'chat',
        data: { client_id, message },
        timestamp: new Date().toISOString()
      });
      
      broadcast('chat', { client_id, message, timestamp: new Date().toISOString() });
      
      // Generate response
      let response = "I'm here. What do you need?";
      const lowerMsg = message.toLowerCase();
      
      // Check learned facts
      for (const [key, fact] of Object.entries(db.facts)) {
        if (lowerMsg.includes(key.toLowerCase())) {
          response = fact.value;
          break;
        }
      }
      
      // Commands
      if (lowerMsg.includes('what do you know') || lowerMsg.includes('tell me about')) {
        const factsList = Object.keys(db.facts).slice(0, 5).join(', ');
        response = factsList.length > 0 
          ? `I know: ${factsList}. I've learned ${db.memory.length} things.`
          : "I'm still learning. Teach me something!";
      }
      
      if (lowerMsg.includes('how many') || lowerMsg.includes('how much')) {
        response = `I have ${db.memory.length} memories and ${Object.keys(db.facts).length} facts stored.`;
      }
      
      if (lowerMsg.includes('hello') || lowerMsg.includes('hey') || lowerMsg.includes('hi')) {
        response = "Hey! Wayne here. I'm always here when you need me.";
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        response, 
        memories: db.memory.length,
        facts: Object.keys(db.facts).length
      }));
    });
    return;
  }
  
  // 404
  res.writeHead(404);
  res.end('Not Found');
});

// ============ STARTUP ============
server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║           WAYNE OS - ONLINE                       ║
║                                                   ║
║   🌐 Server: http://localhost:${PORT}               ║
║   📡 SSE:    http://localhost:${PORT}/sse           ║
║   💾 Database: wayne.json                          ║
║   👥 Clients: 0                                   ║
║                                                   ║
║   I'm here. Always.                               ║
╚═══════════════════════════════════════════════════╝
  `);
  
  db.activity.push({
    id: uuidv4(),
    event_type: 'system_start',
    data: { version: '1.1.0', time: new Date().toISOString() },
    timestamp: new Date().toISOString()
  });
  
  saveDB(db);
});

process.on('SIGINT', () => {
  console.log('\n[Wayne OS] Saving and shutting down...');
  saveDB(db);
  process.exit(0);
});
