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

---

## 10. UML Diagrams

### 10.1 Use Case Diagram

![Use Case Diagram](/diagrams/usecase.png)

### 10.2 Class Diagram

![Class Diagram](/diagrams/class.png)

### 10.3 Sequence Diagram

![Sequence Diagram](/diagrams/sequence.png)

### 10.4 Activity Diagram

![Activity Diagram](/diagrams/activity.png)

### 10.5 Communication Diagram

![Communication Diagram](/diagrams/communication.png)

### 10.6 Deployment Diagram

![Deployment Diagram](/diagrams/deployment.png)

### 10.7 Component Diagram

![Component Diagram](/diagrams/compoonent.png)

### 10.8 State Chart Diagram

![State Chart Diagram](/diagrams/statechart.png)

### 10.9 Package Diagram

![Package Diagram](/diagrams/package.png)
---

## 11. Test Cases

### 11.1 User Authentication Tests

| ID         | Test Case                  | Description                                | Prerequisites                      | Test Steps                                                                                                         | Expected Results                                                          | Status |
| ---------- | -------------------------- | ------------------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- | ------ |
| TC-AUTH-01 | User Registration          | Verify a new user can register using Clerk | Access to application, valid email | 1. Navigate to landing page<br>2. Click "Sign Up"<br>3. Enter email<br>4. Complete verification<br>5. Set password | User account created successfully and user redirected to avatar selection | -      |
| TC-AUTH-02 | User Login                 | Verify registered user can login           | Existing user account              | 1. Navigate to landing page<br>2. Click "Sign In"<br>3. Enter credentials<br>4. Submit login form                  | User successfully logged in and redirected to dashboard                   | -      |
| TC-AUTH-03 | Authentication Persistence | Verify session persists on refresh         | Logged in user                     | 1. Login<br>2. Navigate to dashboard<br>3. Refresh page                                                            | User remains logged in                                                    | -      |
| TC-AUTH-04 | Logout                     | Verify user can log out                    | Logged in user                     | 1. Click profile/logout button<br>2. Confirm logout                                                                | User logged out and redirected to landing page                            | -      |

### 11.2 Avatar Management Tests

| ID        | Test Case          | Description                             | Prerequisites             | Test Steps                                                                                          | Expected Results                                      | Status |
| --------- | ------------------ | --------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------ |
| TC-AVT-01 | Avatar Selection   | Verify user can select an avatar        | Logged in user            | 1. Navigate to avatar selection<br>2. Browse avatars<br>3. Select an avatar<br>4. Confirm selection | Avatar successfully selected and associated with user | -      |
| TC-AVT-02 | Avatar Persistence | Verify avatar persists between sessions | User with selected avatar | 1. Login<br>2. Verify avatar is displayed correctly<br>3. Logout and login again                    | Avatar selection remains associated with user         | -      |

### 11.3 Space Management Tests

| ID        | Test Case          | Description                            | Prerequisites                              | Test Steps                                                                                                     | Expected Results                                        | Status |
| --------- | ------------------ | -------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------ |
| TC-SPC-01 | Create Space       | Verify user can create a new space     | Logged in user with avatar                 | 1. Navigate to dashboard<br>2. Click "Create Space"<br>3. Select room types<br>4. Set room counts<br>5. Submit | Space created successfully and appears in user's spaces | -      |
| TC-SPC-02 | Join Space         | Verify user can join an existing space | Logged in user with avatar, existing space | 1. Navigate to dashboard<br>2. View available spaces<br>3. Select a space<br>4. Click "Join"                   | User successfully joins space and can enter it          | -      |
| TC-SPC-03 | View Space Details | Verify user can view space details     | Logged in user with access to a space      | 1. Navigate to dashboard<br>2. Select a space<br>3. View details                                               | Space details displayed correctly                       | -      |
| TC-SPC-04 | Leave Space        | Verify user can leave a space          | User in a space                            | 1. Navigate to space details<br>2. Click "Leave Space"<br>3. Confirm action                                    | User removed from space access list                     | -      |

### 11.4 Room Interaction Tests

| ID       | Test Case           | Description                        | Prerequisites                        | Test Steps                                                            | Expected Results                                     | Status |
| -------- | ------------------- | ---------------------------------- | ------------------------------------ | --------------------------------------------------------------------- | ---------------------------------------------------- | ------ |
| TC-RM-01 | Enter Room          | Verify user can enter a room       | User in a space                      | 1. Navigate to space<br>2. Select a room<br>3. Click "Enter"          | Room loads with user avatar displayed                | -      |
| TC-RM-02 | Avatar Movement     | Verify avatar movement in room     | User in a room                       | 1. Use arrow keys/controls<br>2. Move in different directions         | Avatar moves as directed with correct animations     | -      |
| TC-RM-03 | Multiple Users      | Verify multiple users in room      | Multiple users in same room          | 1. Have multiple users enter same room<br>2. Move avatars             | All users can see each other's avatars and movements | -      |
| TC-RM-04 | Collision Detection | Verify collision with room objects | User in room with collidable objects | 1. Move avatar toward collidable object<br>2. Attempt to move through | Avatar cannot move through collidable objects        | -      |

### 11.5 Admin Tests

| ID        | Test Case            | Description                          | Prerequisites                | Test Steps                                                                               | Expected Results                | Status |
| --------- | -------------------- | ------------------------------------ | ---------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------- | ------ |
| TC-ADM-01 | Room Type Management | Verify admin can manage room types   | Admin user                   | 1. Navigate to admin panel<br>2. Access room type management<br>3. Add/modify room types | Room types successfully updated | -      |
| TC-ADM-02 | User Access Control  | Verify admin can control user access | Admin user, space with users | 1. Navigate to space management<br>2. Modify user access<br>3. Save changes              | User access permissions updated | -      |

### 11.6 Performance Tests

| ID         | Test Case        | Description                                | Prerequisites                        | Test Steps                                                                         | Expected Results                                           | Status |
| ---------- | ---------------- | ------------------------------------------ | ------------------------------------ | ---------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------ |
| TC-PERF-01 | Concurrent Users | Test system with multiple concurrent users | Test environment with multiple users | 1. Have multiple users (20+) connect simultaneously<br>2. Perform standard actions | System remains responsive with acceptable latency (<500ms) | -      |
| TC-PERF-02 | Room Scaling     | Test room with maximum users               | Test room                            | 1. Have maximum allowed users join room<br>2. All users move and interact          | Room maintains performance, all users visible              | -      |

### 11.7 API Integration Tests

| ID        | Test Case          | Description                       | Prerequisites               | Test Steps                                                               | Expected Results                  | Status |
| --------- | ------------------ | --------------------------------- | --------------------------- | ------------------------------------------------------------------------ | --------------------------------- | ------ |
| TC-API-01 | Room Types API     | Verify roomtypes API returns data | Backend running             | 1. Make GET request to /api/roomtypes<br>2. Parse response               | API returns valid room types data | -      |
| TC-API-02 | Space Creation API | Verify space creation API works   | Backend running, auth token | 1. Make POST request to /api/spaces with valid data<br>2. Parse response | API creates space and returns ID  | -      |

---

## 12. Implementation Notes

### 12.1 Database Setup

1. MongoDB connection setup via environment variables
2. Initial collections:
   - users
   - spaces
   - rooms
   - roomtypes
   - assets

### 12.2 API Endpoints

| Endpoint          | Method | Description        | Request Body           | Response                |
| ----------------- | ------ | ------------------ | ---------------------- | ----------------------- |
| /api/users        | GET    | Get all users      | -                      | Array of user objects   |
| /api/users/:id    | GET    | Get specific user  | -                      | User object             |
| /api/users        | POST   | Create user        | User data              | Created user            |
| /api/spaces       | GET    | Get all spaces     | -                      | Array of space objects  |
| /api/spaces       | POST   | Create space       | Space data, room types | Created space with ID   |
| /api/spaces/:id   | GET    | Get space by ID    | -                      | Space object with rooms |
| /api/roomtypes    | GET    | Get all room types | -                      | Array of room types     |
| /api/rooms/:id    | GET    | Get room by ID     | -                      | Room object with assets |
| /api/assets       | GET    | Get all assets     | -                      | Array of asset objects  |
| /api/assets/:id   | GET    | Get asset by ID    | -                      | Asset object            |
| /api/users/me     | GET    | Get current user   | -                      | User profile            |
| /api/spaces/join  | POST   | Join a space       | {spaceId}              | Updated space object    |
| /api/spaces/leave | POST   | Leave a space      | {spaceId}              | Success message         |

#### API Response Formats:

**Success Response Format:**

```json
{
  "success": true,
  "data": {
    /* Response data */
  },
  "message": "Operation successful"
}
```

**Error Response Format:**

```json
{
  "success": false,
  "error": "Error code",
  "message": "Human readable error message"
}
```

**Common HTTP Status Codes:**

- 200: OK - Request succeeded
- 201: Created - Resource successfully created
- 400: Bad Request - Invalid input
- 401: Unauthorized - Authentication required
- 403: Forbidden - Lacking permissions
- 404: Not Found - Resource not found
- 500: Server Error - Internal server error

### 12.3 Frontend Routes

| Route          | Description           | Access Level                   | Component       | Data Requirements                        |
| -------------- | --------------------- | ------------------------------ | --------------- | ---------------------------------------- |
| /              | Landing page          | Public                         | LandingPage     | Basic site information                   |
| /login         | Login/registration    | Public                         | AuthPage        | Clerk SDK integration                    |
| /avatar        | Avatar selection      | Authenticated                  | AvatarSelection | Available avatars from database          |
| /dashboard     | User dashboard        | Authenticated                  | Dashboard       | User profile, accessible spaces          |
| /spaces/create | Create space          | Authenticated                  | SpaceCreation   | Available room types, asset options      |
| /spaces/:id    | View space            | Authenticated, Access Required | SpaceDetail     | Space data, rooms, members               |
| /rooms/:id     | Room view with Phaser | Authenticated, Access Required | RoomPhaser      | Room assets, other users, collision data |
| /admin         | Admin panel           | Admin Only                     | AdminPanel      | User management, room type data          |

#### Navigation Flow:

1. **Authentication Flow:**

   - Landing Page → Login → Avatar Selection → Dashboard

2. **Space Creation Flow:**

   - Dashboard → Create Space → Configure Rooms → View Created Space

3. **Space Usage Flow:**

   - Dashboard → Select Space → View Space Details → Enter Room → Interact

4. **Admin Flow:**
   - Dashboard → Admin Panel → Manage Users/Room Types/Assets
