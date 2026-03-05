# Wayne OS

Your ever-present AI companion that runs in the background of Luo Desktop.

## Quick Start

### 1. Start the Server

```bash
cd /root/.openclaw/workspace/wayne-os
node src/server.js
```

The server will start on port **3847**.

### 2. Open Luo Desktop

Open `luo-browser/desktop.html` in your browser. Wayne OS will automatically connect and appear as a floating bubble 👊

---

## Architecture

```
┌─────────────────────────────────────────────┐
│           Wayne OS Backend                  │
│  • HTTP Server (port 3847)                  │
│  • SSE (Server-Sent Events) for real-time    │
│  • JSON file storage (wayne.json)           │
│  • Always running, survives tab closes      │
└─────────────────────────────────────────────┘
                    ▲
                    │ SSE + HTTP
                    ▼
┌─────────────────────────────────────────────┐
│           Luo Desktop                        │
│  • Wayne bubble (draggable)                 │
│  • Chat panel                               │
│  • Connects automatically                   │
└─────────────────────────────────────────────┘
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/status` | Server status, uptime, stats |
| GET | `/sse` | Server-Sent Events stream |
| GET | `/api/memory` | Get all memories |
| POST | `/api/memory` | Add new memory |
| GET | `/api/facts` | Get learned facts |
| POST | `/api/fact` | Learn a new fact |
| POST | `/api/chat` | Send a message, get response |
| GET | `/api/activity` | Get activity log |
| POST | `/api/activity` | Log an event |

---

## Making Wayne Always-On

### Option 1: Systemd Service (Linux)

```bash
sudo cp wayne-os.service /etc/systemd/system/
sudo systemctl enable wayne-os
sudo systemctl start wayne-os
```

### Option 2: Screen/Tmux

```bash
tmux new -s wayne-os
node src/server.js
# Detach with Ctrl+B, D
```

### Option 3: PM2

```bash
npm install -g pm2
pm2 start src/server.js --name wayne-os
pm2 save
```

---

## Features

- **Always Running** — Backend stays up even when Luo Desktop is closed
- **Memory** — Remembers everything you teach it
- **Real-time Updates** — SSE pushes updates instantly
- **Draggable Bubble** — Position Wayne anywhere on your desktop
- **Multi-client** — Works on multiple devices, shares memory

---

## Teach Wayne Things

Just chat naturally! Try:
- "Remember that my name is [name]"
- "I work from 9 to 5"
- "My favorite color is blue"

Wayne learns and remembers.

---

## Files

```
wayne-os/
├── src/
│   └── server.js      # Main server (no dependencies!)
├── wayne-client.js    # Luo Desktop integration
├── wayne-os.service   # Systemd service file
├── package.json       # Node info
└── data/
    └── wayne.json    # Database (auto-created)
```

---

*"I'm here. Always."* 👊
