# Software Requirements Specification (SRS)

## Project: MetaVerse 2D Virtual Space Platform

---

## 1. Introduction

### 1.1 Purpose

The purpose of this document is to specify the requirements for the MetaVerse project, a web-based platform that allows users to interact in customizable 2D virtual spaces using avatars.

### 1.2 Scope

MetaVerse enables users to:

- Register and authenticate using Clerk.
- Select and customize 2D avatars.
- Create, join, and manage virtual spaces and rooms.
- Interact with other users in real time.
- Experience a 2D game-like environment powered by Phaser.

### 1.3 Definitions, Acronyms, and Abbreviations

- **Avatar**: A 2D graphical representation of a user.
- **Space**: A virtual environment containing rooms and users.
- **Room**: A sub-area within a space, with its own assets and interactions.
- **Clerk**: Third-party authentication provider.
- **Phaser**: 2D game engine for rendering and interaction.

---

## 2. Overall Description

### 2.1 Product Perspective

MetaVerse is a full-stack web application with a React + Vite frontend and a Node.js/Express backend, using MongoDB for data storage.

### 2.2 Product Functions

- User authentication and profile management.
- Avatar selection and customization.
- Space and room creation, joining, and management.
- Real-time user interaction and movement.
- Asset management for avatars and room items.

### 2.3 User Classes and Characteristics

- **Guest**: Can view the landing page but must sign in to interact.
- **Registered User**: Can create/join spaces, select avatars, and interact.
- **Admin**: User who creates a space and manages its rooms and members.

### 2.4 Operating Environment

- Web browsers (Chrome, Firefox, Edge, Safari).
- Node.js server environment.
- MongoDB database.

### 2.5 Design and Implementation Constraints

- Only non-commercial use of certain assets (see asset licenses).
- Must use Clerk for authentication.
- Must use MongoDB for persistent storage.

---

## 3. System Features

### 3.1 User Authentication

- Users can sign up, sign in, and sign out using Clerk.
- Only authenticated users can access dashboard and spaces.

### 3.2 Avatar Management

- Users select an avatar from available assets.
- Avatar selection is required before accessing spaces.

### 3.3 Space and Room Management

- Users can create new spaces, specifying room types and counts.
- Users can join existing spaces.
- Each space contains one or more rooms.
- Admins can manage rooms within their spaces.

### 3.4 Real-Time Interaction

- Users can move avatars in rooms (Phaser-based).
- Real-time updates for user positions and interactions (future: WebSocket/mediasoup).

### 3.5 Asset Management

- Admins can add new avatars and room assets (future).
- Assets are stored in MongoDB and served to the client.

---

## 4. External Interface Requirements

### 4.1 User Interfaces

- Responsive web UI with 2D pixel-art theme.
- Navigation: Home, Dashboard, Avatar Selection, Create/Join Space, Room View.

### 4.2 Hardware Interfaces

- None (web-based).

### 4.3 Software Interfaces

- Clerk API for authentication.
- REST API endpoints for user, asset, space, and room management.
- WebSocket endpoints for real-time features (future).

### 4.4 Communications Interfaces

- HTTP/HTTPS for REST API.
- WebSocket for real-time communication.

---

## 5. System Architecture

### 5.1 Frontend

- React + TypeScript + Vite.
- Uses Clerk for authentication.
- Phaser for 2D game rendering.

### 5.2 Backend

- Node.js + Express.
- MongoDB for data storage.
- REST API for CRUD operations.
- WebSocket/mediasoup for real-time (future).

---

## 6. Functional Requirements

### 6.1 User Registration and Login

- FR1: The system shall allow users to register and log in using Clerk.

### 6.2 Avatar Selection

- FR2: The system shall require users to select an avatar before accessing spaces.

### 6.3 Space Creation and Management

- FR3: The system shall allow users to create new spaces and specify room types/counts.
- FR4: The system shall allow users to join existing spaces.

### 6.4 Room Navigation and Interaction

- FR5: The system shall allow users to move their avatars in rooms.
- FR6: The system shall display other users present in the same room.

### 6.5 Asset Management

- FR7: The system shall allow admins to add new avatars and room assets (future).

---

## 7. Non-Functional Requirements

- NFR1: The system shall be responsive and usable on desktop and mobile browsers.
- NFR2: The system shall store user and space data persistently in MongoDB.
- NFR3: The system shall enforce asset license restrictions.
- NFR4: The system shall provide error messages for failed operations.

---

## 8. Future Enhancements

- Voice/video chat integration.
- Custom avatar uploads.
- Space invitations and access control.
- Advanced room/asset customization.
- Real-time chat and notifications.

---

## 9. Appendix

- See `/client/Modern tiles_Free/LICENSE.txt` for asset license.
- See `/server/src/Models/` for data model definitions.
