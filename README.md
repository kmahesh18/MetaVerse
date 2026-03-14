# Metaverse 2D

A Gather.town-style 2D virtual workspace platform designed for remote teams and communities to collaborate, chat, and connect in a playful, interactive environment.

## 🌟 Features

*   **Real-time Exploration:** Walk around 2D curated rooms using WASD/Arrow keys, integrated with Phaser 3.
*   **WebRTC Media Calls:** Integrated Audio and Video proximity and room-wide calls.
*   **Secure TURN Infrastructure:** Custom Azure VM running Coturn with HMAC REST Authentication for secure fallback media relay.
*   **Interactive Environments:** Sit on chairs, read notice boards, use water coolers, and interact with objects.
*   **Multiplayer Synchronization:** Real-time character movement and state synchronization via Socket.io.
*   **Space Management:** Create unique spaces and multiple room templates (Lobbies, Offices, Gardens, etc.).

## 🏗️ Architecture

The project is structured as a **Turborepo** monorepo using `pnpm`.

*   `apps/web`: Next.js frontend, Phaser 3 game engine, Tailwind CSS, Zustand state management.
*   `apps/server`: Node.js, Express, Socket.io, MongoDB backend.
*   `packages/shared`: Shared TypeScript interfaces, types, schemas, and game constants.

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
STUN_URL=stun:stun.l.google.com:19302
TURN_URL=turn:98.70.28.87:3478
TURN_SECRET=your_turn_hmac_secret

# === FRONTEND (NEXT_PUBLIC_) ===
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
NEXT_PUBLIC_STUN_URL=stun:stun.l.google.com:19302
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
