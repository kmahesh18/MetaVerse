# Metaverse 2D

A Gather.town-style 2D virtual workspace platform designed for remote teams and communities to collaborate, chat, and connect in a playful, interactive environment.

## 🌟 Features

*   **Real-time Exploration:** Walk around 2D curated rooms using WASD/Arrow keys, integrated with Phaser 3.
*   **WebRTC Video Calls:** Room-wide and direct video/audio calls — call anyone in the room, add people to a call, or call everyone at once.
*   **Proximity Chat:** Public room-wide chat plus proximity-based messaging with adjustable range (1–10 tiles).
*   **Secure TURN Infrastructure:** Custom TURN server (Coturn) with HMAC REST Authentication for relay when direct connections fail.
*   **Interactive Environments:** Sit on chairs, read notice boards, use water coolers, and interact with objects.
*   **Multiplayer Synchronization:** Real-time character movement and state synchronization via Socket.io.
*   **Space Management:** Create unique spaces and multiple room templates (Lobbies, Offices, Gardens, etc.).

## 🏗️ Architecture

The project is structured as a **Turborepo** monorepo using `pnpm`.

*   `apps/web`: Next.js frontend, Phaser 3 game engine, Tailwind CSS, Zustand state management.
*   `apps/server`: Node.js, Express, Socket.io, MongoDB backend.
*   `packages/shared`: Shared TypeScript interfaces, types, schemas, and game constants.

---

## 📡 WebRTC & TURN Infrastructure

### How Connections Work

This app uses **WebRTC** for peer-to-peer video/audio calls. Here's how connections are established:

| Scenario | Connection Type | How it Works |
|----------|----------------|--------------|
| **Same Wi-Fi / LAN** | **Direct (host candidates)** | Peers discover each other's local IP and connect directly — no server relay needed |
| **Different networks** | **TURN relay** | Traffic is relayed through the TURN server when direct connection fails |

### ICE, STUN & TURN — Explained

| Term | What It Is | Used Here? |
|------|-----------|------------|
| **ICE** (Interactive Connectivity Establishment) | Protocol that discovers the best connection path between two peers. It gathers "candidates" (possible connection routes) and tests them. | ✅ Yes — built into WebRTC |
| **STUN** (Session Traversal Utilities for NAT) | A lightweight server that tells a peer its public IP address. Used to create "server reflexive" candidates. | ❌ No — not needed because our TURN server handles this |
| **TURN** (Traversal Using Relays around NAT) | A relay server that forwards media between peers when direct connection is impossible (strict firewalls, symmetric NATs). Also provides reflexive candidates like STUN. | ✅ Yes — our Coturn server |

### Why No STUN?

STUN servers (like Google's `stun:stun.l.google.com:19302`) only help discover public IPs. A **TURN server already provides this capability** as part of its allocation process. Since we run our own Coturn TURN server:

1. **Same network:** Direct host-candidate connections work without any server
2. **Different networks:** The TURN server provides both reflexive candidates (like STUN would) AND relay candidates
3. **Result:** No external STUN dependency needed — your TURN server handles everything

### Configuration

The backend generates short-lived TURN credentials via HMAC REST authentication:

```env
# .env — only TURN config needed
TURN_URL=turn:your-server-ip:3478
TURN_SECRET=your_shared_hmac_secret
```

The frontend fetches TURN credentials from the `/api/turn-credentials` endpoint. No STUN URLs are configured.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
*   Node.js v20+
*   `pnpm` (run `corepack enable pnpm`)
*   MongoDB Atlas cluster (or local MongoDB)

### 1. Clone & Install
```bash
git clone <repository-url>
cd metaverse
pnpm install
```

### 2. Configure Environment
Create a `.env` file at the root of the repository. See `.env.example` or use this minimal setup:

```env
# === BACKEND ===
PORT=3001
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.net/metaverse
JWT_SECRET=super_secret_jwt_key
JWT_REFRESH_SECRET=super_secret_refresh_key
# Comma-separated allowed CORS origins
CLIENT_URL=http://localhost:3000

# === WEBRTC / TURN CONFIG ===
TURN_URL=turn:your-server-ip:3478
TURN_SECRET=your_turn_hmac_secret

# === FRONTEND (NEXT_PUBLIC_) ===
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

### 3. Run Development Servers
```bash
pnpm dev
```

This will concurrently start:
*   Frontend at `http://localhost:3000`
*   Backend at `http://localhost:3001`

---

## 🚢 Deployment

The application is configured for a modern cloud deployment stack:
*   **Frontend**: Vercel
*   **Backend**: Render (Docker)
*   **TURN Server**: Azure VM (Coturn)

Please see the comprehensive [DEPLOYMENT.md](./DEPLOYMENT.md) for step-by-step instructions.
For TURN server setup, see [turn.md](./turn.md).
