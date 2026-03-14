# Metaverse Deployment Guide

This document outlines the step-by-step process for deploying the Metaverse application to production.

The deployment relies on three separate platforms to handle specific workloads:
1.  **Vercel**: For hosting the `apps/web` Next.js frontend.
2.  **Render**: For running the `apps/server` Express/Socket.io backend using Docker.
3.  **Azure VM**: For hosting a secure Coturn TURN server necessary for WebRTC traversal.

---

## 1. TURN Server (Azure VM)

A TURN server is required for WebRTC to relay media when direct peer-to-peer connection fails. We use Coturn secured through HMAC REST Authentication.

For full VM setup instructions, refer to `turn.md` in the repository.

### Key Configuration
Coturn config (`/etc/turnserver.conf`) must include:
```text
use-auth-secret
static-auth-secret=YOUR_LONG_RANDOM_SECRET
```
*Take note of the `static-auth-secret`, as you will need it for the backend's environment variables.*

---

## 2. Backend Deployment (Render)

The backend exposes REST APIs and handles the persistent WebSocket connections for real-time multiplayer.

### Prerequisites
*   A Render account.
*   A MongoDB Atlas connection string (`MONGODB_URI`).

### Deployment Steps
The repository includes a `render.yaml` Blueprint and a multi-stage `Dockerfile`.

1.  Connect your GitHub repository to Render.
2.  Render will detect the `render.yaml` Blueprint and prompt you to create a **Web Service**.
3.  **Plan:** Select the **Starter ($7/mo)** plan.
    *   *Note: Render's Free tier spins down after 15 minutes of inactivity, which drops all active WebSocket connections. The Starter plan ensures the game server stays alive.*
4.  Render will prompt you to provide the `MONGODB_URI`.
5.  Wait for the deployment to finish and copy the Render URL (e.g., `https://metaverse-api.onrender.com`).

---

## 3. Frontend Deployment (Vercel)

The frontend is a Next.js application that needs to be configured to talk to your production backend.

1.  Import your GitHub repository into Vercel.
2.  Vercel will detect it's a Turborepo. Leave the "Root Directory" default (or set to `apps/web` if you prefer). The included `vercel.json` ensures the shared packages are built correctly.
3.  Add the following **Environment Variables**:
    *   `NEXT_PUBLIC_API_URL`: `<render-url>/api` (e.g., `https://metaverse-api.onrender.com/api`)
    *   `NEXT_PUBLIC_SOCKET_URL`: `<render-url>` (e.g., `https://metaverse-api.onrender.com`)
    *   `NEXT_PUBLIC_STUN_URL`: `stun:stun.l.google.com:19302`
4.  Deploy the project.
5.  Copy the Vercel production deployment URL (e.g., `https://metaverse.vercel.app`).

---

## 4. Finalize CORS and Environment Binding

Now that you have both the Frontend and Backend URLs, you must tie them together securely via the single root `.env` / Environment Variables settings.

### Update Backend Environment Variables on Render

Go to your Render Web Service -> **Environment**, and update the `CLIENT_URL` to include your Vercel URL. It accepts a comma-separated list of origins.

**Required Backend Variables:**
```env
# Render manages NODE_ENV and PORT automatically
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret

# Link the frontend URL for CORS
CLIENT_URL=https://metaverse.vercel.app,http://localhost:3000

# Link the TURN Server configuration
STUN_URL=stun:stun.l.google.com:19302
TURN_URL=turn:YOUR_AZURE_IP:3478
TURN_SECRET=YOUR_LONG_RANDOM_SECRET # Must match Coturn static-auth-secret
```

### Verification
1.  Navigate to your Vercel URL.
2.  Open the browser console to ensure there are no CORS or WebSocket connection errors.
3.  Register a user, create a space, and enter a room.
4.  Test video calling to ensure the client successfully hits `/api/turn-credentials` and acquires temporary relay credentials cleanly.
