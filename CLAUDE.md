# Metaverse — 2D Virtual Workspace Platform

## Overview

Gather.town-style 2D virtual workspace where users create/join company "spaces" with rooms, move 16×16 pixel-art avatars, chat (proximity/DM/broadcast/room), video/audio call via WebRTC, manage tasks, and interact with 2D assets.

## Architecture

```
metaverse/
├── CLAUDE.md                      — This file
├── turbo.json                     — Turborepo pipeline config
├── pnpm-workspace.yaml            — pnpm workspace definition
├── package.json                   — Root workspace package
├── .env.example                   — Env template
├── turn.md                        — Coturn TURN server setup guide
│
├── packages/
│   └── shared/                    — Shared TypeScript types & constants
│       └── src/
│           ├── types/             — All model interfaces + socket events + WebRTC
│           └── constants/         — Roles, permissions, game config (tile size, speeds)
│
├── apps/
│   ├── server/                    — Express + Socket.io + Mongoose backend
│   │   └── src/
│   │       ├── index.ts           — Entry: Express + HTTP server + Socket.io
│   │       ├── config/            — db.ts (Mongoose), env.ts (Zod validation), cors.ts
│   │       ├── models/            — 11 Mongoose models
│   │       ├── middleware/        — auth.ts (JWT), rbac.ts, validate.ts (Zod)
│   │       ├── routes/            — REST route files (auth, user, space, room, asset, message, task, invitation)
│   │       ├── controllers/       — Request handlers
│   │       ├── services/          — Business logic layer
│   │       ├── socket/            — Socket.io event handlers
│   │       │   ├── index.ts       — io setup, JWT auth middleware, namespace
│   │       │   ├── movement.ts    — player:move, player:stop
│   │       │   ├── chat.ts        — room/DM/broadcast/proximity chat
│   │       │   ├── proximity.ts   — Distance-based enter/leave detection
│   │       │   ├── room.ts        — room:join, room:leave, room:players
│   │       │   ├── webrtc.ts      — Signaling: offer, answer, ice-candidate
│   │       │   └── interaction.ts — player:sit/stand, interaction:use
│   │       ├── utils/             — jwt.ts, hash.ts, iceServers.ts
│   │       └── seed/              — Default assets & avatars seed data
│   │
│   └── web/                       — Next.js 15 + Phaser 3 frontend
│       ├── app/                   — App Router pages
│       │   ├── page.tsx           — Landing page (Claude-themed, dark/light)
│       │   ├── (auth)/            — Login, register pages
│       │   ├── (dashboard)/       — Dashboard, spaces, rooms, tasks
│       │   └── game/[roomId]/     — Main game view (Phaser canvas + HUD)
│       ├── components/            — React components
│       │   ├── ui/                — shadcn/ui primitives
│       │   ├── layout/            — Navbar, Sidebar, ThemeToggle
│       │   ├── landing/           — Hero, Features, Footer
│       │   ├── game/              — GameCanvas, GameHUD, ChatPanel, VideoOverlay
│       │   └── space/             — SpaceCard, CreateSpaceModal, InviteModal
│       ├── game/                  — Phaser code (non-React)
│       │   ├── PhaserGame.ts      — Phaser.Game factory
│       │   ├── scenes/            — BootScene, GameScene, UIScene
│       │   ├── entities/          — Player, RemotePlayer, InteractiveObject
│       │   ├── systems/           — Movement, Collision, Proximity, Interaction
│       │   └── managers/          — SocketManager, WebRTCManager, PlayerManager
│       ├── lib/                   — api.ts, socket.ts, webrtc.ts, auth.ts
│       ├── hooks/                 — useSocket, useWebRTC, useAuth, useGame
│       ├── providers/             — AuthProvider, SocketProvider, ThemeProvider
│       └── public/assets/         — Organized game sprites
│           ├── characters/        — char_0–5.png, characters.png
│           ├── tiles/             — Floor tiles from Kenney 1-bit-pack
│           ├── furniture/         — Desks, chairs, shelves from Kenney
│           ├── decorations/       — Plants, books, pictures
│           ├── nature/            — Trees, bushes from tiny-town
│           ├── walls/             — walls.png + segments
│           └── lottie/            — office.json Lottie animation
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), Phaser 3.80, Tailwind CSS 4, shadcn/ui, Lottie |
| Backend | Node.js, Express 4, Socket.io 4, Mongoose 8 |
| Database | MongoDB Atlas (free M0 tier) |
| Auth | JWT (access 15m + refresh 7d, bcrypt) |
| Real-time | Socket.io (movement, chat, presence) + WebRTC (peer-to-peer audio/video) |
| Monorepo | Turborepo + pnpm workspaces |
| Assets | 16×16 pixel art — Kenney CC0 packs (1-Bit, Tiny Town, Tiny Dungeon) |

## Core Concepts

**Vocabulary**: Space = company/organization. Room = area within a space. Player = user's avatar in a room. Asset = placeable 2D sprite (furniture, tile, decoration).

**Data Flow**: REST APIs for CRUD operations. Socket.io for real-time state (movement, chat, presence). WebRTC for peer-to-peer audio/video (signaled through Socket.io).

**One-user-per-socket**: Each authenticated Socket.io connection maps 1:1 to a user. Server tracks userId → {socketId, roomId, position} in-memory Map.

**Proximity system**: Server calculates Manhattan distance between players on every movement update. Emits `proximity:enter`/`proximity:leave` when crossing 3-tile (48px) threshold. Triggers auto-audio connections and proximity chat visibility.

## MongoDB Schema — 11 Models

| Model | Key Fields | Notes |
|-------|-----------|-------|
| **User** | email (unique), passwordHash, displayName, avatarConfig, status, preferences | status: online/away/busy/offline |
| **Space** | name, slug (unique), ownerId→User, visibility, settings | visibility: public/private/invite-only |
| **SpaceMember** | spaceId+userId (compound unique), role, permissions | role: owner/admin/moderator/member/guest |
| **Room** | spaceId, name, type, mapConfig, maxOccupancy, isLocked | type: lobby/office/meeting/lounge/garden/library/custom |
| **RoomObject** | roomId, assetId, position {x,y}, interactionType, interactionData | interactionType: none/sit/read/use/teleport/whiteboard |
| **Asset** | name, slug, category, spriteSheet, dimensions, tags[] | category: tile/furniture/decoration/nature/tech/wall/character/effect |
| **Avatar** | name, spriteSheetUrl, frameConfig (directional animations), isDefault | 4-direction walk/idle + sit animations |
| **Message** | type, senderId, roomId/spaceId/recipientId, content, readBy[] | type: room/direct/broadcast/proximity |
| **Task** | spaceId, roomId?, title, status, priority, assigneeId, comments[] | status: todo/in-progress/review/done |
| **Invitation** | spaceId, inviterId, inviteeEmail, token (uuid), status, expiresAt | status: pending/accepted/declined/expired |
| **PlayerState** | userId (unique), roomId, position, direction, socketId | Ephemeral — in-memory primary, MongoDB for crash recovery |

## Socket.io Event Map

### Client → Server
| Event | Payload |
|-------|---------|
| `room:join` | `{ roomId }` |
| `room:leave` | `{ roomId }` |
| `player:move` | `{ x, y, direction }` — throttled ~60ms |
| `player:stop` | `{ x, y, direction }` |
| `player:sit` | `{ objectId }` |
| `player:stand` | — |
| `chat:room` | `{ roomId, content }` |
| `chat:dm` | `{ recipientId, content }` |
| `chat:broadcast` | `{ spaceId, content }` |
| `chat:proximity` | `{ content }` |
| `webrtc:offer` | `{ targetUserId, offer }` |
| `webrtc:answer` | `{ targetUserId, answer }` |
| `webrtc:ice-candidate` | `{ targetUserId, candidate }` |
| `webrtc:call-start` | `{ targetUserId }` |
| `webrtc:call-end` | `{ targetUserId }` |
| `interaction:use` | `{ objectId }` |

### Server → Client
| Event | Payload |
|-------|---------|
| `room:players` | `[{ userId, x, y, direction, avatar, displayName }]` |
| `player:joined` | `{ userId, x, y, avatar, displayName }` |
| `player:left` | `{ userId }` |
| `player:moved` | `{ userId, x, y, direction }` |
| `player:stopped` | `{ userId, x, y, direction }` |
| `player:sat` | `{ userId, objectId }` |
| `player:stood` | `{ userId }` |
| `chat:message` | `{ type, senderId, content, timestamp, senderName }` |
| `proximity:enter` | `{ userId, displayName }` |
| `proximity:leave` | `{ userId }` |
| `webrtc:offer` | `{ fromUserId, offer }` |
| `webrtc:answer` | `{ fromUserId, answer }` |
| `webrtc:ice-candidate` | `{ fromUserId, candidate }` |
| `user:status` | `{ userId, status }` |

## WebRTC Flow

1. Player A enters proximity of Player B → server emits `proximity:enter` to both
2. Player A initiates call → `webrtc:call-start` → server relays to B
3. A creates RTCPeerConnection with ICE config (STUN from env)
4. A creates offer → `webrtc:offer` → server relays to B
5. B creates answer → `webrtc:answer` → server relays to A
6. Both exchange ICE candidates via `webrtc:ice-candidate`
7. P2P audio/video established
8. On leave proximity or call-end → cleanup connections

**Meeting rooms**: auto-mesh all occupants (max 6 peers) on room entry.

## Build & Dev

```bash
# Install all dependencies
pnpm install

# Development (runs both server + web concurrently)
pnpm dev

# Build all packages
pnpm build

# Run only server
pnpm --filter server dev

# Run only web
pnpm --filter web dev
```

## TypeScript Constraints

- Use `as const` objects instead of `enum` (erasableSyntaxOnly)
- `import type` for type-only imports (verbatimModuleSyntax)
- Strict mode enabled across all packages

## Environment Variables

### Server (`apps/server/.env`)
```
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<64-char-random>
JWT_REFRESH_SECRET=<64-char-random>
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
CLIENT_URL=http://localhost:3000
STUN_URL=stun:stun.l.google.com:19302
```

### Client (`apps/web/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
NEXT_PUBLIC_STUN_URL=stun:stun.l.google.com:19302
```

## Key Patterns

- **REST** for CRUD, **Socket.io** for real-time state, **WebRTC** for media
- **In-memory Map** for player positions (single-process dev). Redis adapter ready via env for horizontal scaling
- **Throttled movement**: client emits position at ~60ms intervals, server broadcasts to room
- **Proximity detection**: server-side distance calculation on every movement update
- **JWT auth on sockets**: token passed in Socket.io handshake `auth` object, verified on `connection`
- **Shared types**: `packages/shared` prevents frontend/backend type drift
- **Phaser ↔ React bridge**: Phaser game runs in a React component via `useEffect`, communicates through event emitter pattern

## Game Constants

- `TILE_SIZE`: 16px
- `PLAYER_SPEED`: 2 tiles/sec (32px/sec)
- `PROXIMITY_RADIUS`: 3 tiles (48px)
- `MOVEMENT_EMIT_INTERVAL`: 60ms
- `MAP_DEFAULT_WIDTH`: 30 tiles
- `MAP_DEFAULT_HEIGHT`: 20 tiles

## Asset Sources (all CC0/free)

| Source | Content |
|--------|---------|
| Kenney 1-Bit Pack | 1078 sprites — characters, furniture, tiles, UI |
| Kenney Tiny Town | 132 sprites — buildings, roads, nature |
| Kenney Tiny Dungeon | 132 sprites — characters, props, tiles |
| LottieFiles.com | Free Lottie animations for landing page |
