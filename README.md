# 🌐 MetaVerse

A real-time multiplayer metaverse platform with WebRTC video/audio communication, built with React, Node.js, MediaSoup, and WebSockets.

## 🚀 Features

- **Real-time Multiplayer**: Multiple users can join spaces and see each other's movements in real-time
- **Video/Audio Communication**: WebRTC-based video and audio using MediaSoup
- **Avatar Selection**: Choose from multiple character avatars
- **Space Management**: Create and join custom spaces with different maps
- **Authentication**: Secure authentication using Clerk
- **Persistent State**: MongoDB for storing users, spaces, and game state

## 🛠️ Tech Stack

### Frontend
- React 19
- TypeScript
- Vite
- Phaser 3 (Game Engine)
- WebSocket Client
- Clerk Authentication

### Backend
- Node.js 18
- Express
- TypeScript
- MediaSoup (WebRTC SFU)
- WebSocket Server
- MongoDB
- Clerk Authentication

### Infrastructure
- Docker & Docker Compose
- Nginx (Production)

## 📦 Project Structure

```
MetaVerse/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── Game/          # Phaser game logic
│   │   └── assets/        # Static assets
│   ├── Dockerfile
│   └── package.json
├── server/                 # Node.js backend application
│   ├── src/
│   │   ├── api/           # REST API routes
│   │   ├── handlers/      # WebSocket handlers
│   │   ├── mediasoup/     # MediaSoup setup
│   │   ├── Models/        # MongoDB models
│   │   └── services/      # Business logic
│   ├── Dockerfile
│   └── package.json
├── shared/                 # Shared TypeScript types
│   └── types.ts
├── docker-compose.yml      # Docker orchestration
└── .env                    # Environment variables
```

## 🔧 Prerequisites

- Docker Desktop (with 8GB+ RAM allocated)
- Node.js 18+ (for local development)
- MongoDB Atlas account (or local MongoDB)
- Clerk account for authentication

## 🏃 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/MetaVerse.git
cd MetaVerse
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/

# Clerk Authentication
CLERK_SECRET_KEY=sk_test_xxxxx
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx

# Server Configuration
PORT=3000
SERVER_PUBLIC_IP=your.server.ip  # Use 127.0.0.1 for local

# Client Configuration
CLIENT_URL=http://localhost:3001
VITE_BACKEND_URL=http://localhost:3000

# MediaSoup Ports
MEDIASOUP_MIN_PORT=40000
MEDIASOUP_MAX_PORT=49999
```

### 3. Run with Docker

```bash
# Build and start all services
docker compose up --build

# Run in detached mode
docker compose up -d

# View logs
docker logs metaverse-server -f
docker logs metaverse-client -f

# Stop services
docker compose down
```

The application will be available at:
- **Client**: http://localhost:80 (or configured port)
- **Server API**: http://localhost:3000

## 🌐 Deployment

### Recommended Platforms

#### Railway.app (Easiest)
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

#### Render.com
1. Connect your GitHub repository
2. Create a new Web Service for server
3. Create a new Static Site for client
4. Configure environment variables
5. Deploy

#### Fly.io
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login and launch
fly auth login
fly launch
```

### Environment Variables for Production

Ensure these are set in your deployment platform:
- `MONGODB_URI`: Your MongoDB Atlas connection string
- `CLERK_SECRET_KEY`: Production Clerk secret key
- `VITE_CLERK_PUBLISHABLE_KEY`: Production Clerk publishable key
- `SERVER_PUBLIC_IP`: Your server's public IP address
- `CLIENT_URL`: Your frontend domain
- `VITE_BACKEND_URL`: Your backend domain

## 🔒 Port Requirements

- **80 or 3001**: HTTP/HTTPS for client
- **3000**: HTTP/WebSocket for server
- **40000-49999**: UDP/TCP for MediaSoup WebRTC

## 🧪 Local Development (Without Docker)

### Server
```bash
cd server
npm install
npm run dev
```

### Client
```bash
cd client
npm install
npm run dev
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [MediaSoup](https://mediasoup.org/) for WebRTC SFU
- [Phaser](https://phaser.io/) for game engine
- [Clerk](https://clerk.com/) for authentication
- [Railway](https://railway.app/) for easy deployment
