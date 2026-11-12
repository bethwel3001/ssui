# ssui!

A real-time event Q&A and audience polling platform built with modern Angular and serverless AWS architecture. Enables communities, conference speakers, and teams to host interactive rooms where attendees can ask questions, participate in live polls, and upvote the most relevant topics in real time.

---

## Features

- **Multi-Room Workspaces:** Join any room via a unique code (e.g. `#tech-meetup`, `#product-ama`) or launch a custom space instantly.
- **Dynamic Q&A Gating:** Room creators can open or pause question submissions at any time to focus on answering existing questions.
- **Real-Time Upvoting (SSUI!):** Low-latency upvote counters with optimistic client-side updates and atomic server increments.
- **Host Moderation:** Creators can flag questions as answered, pin prioritized questions to the top, or remove inappropriate submissions.
- **Interactive Community Polls:** Real-time poll voting with animated percentage distribution bars.
- **Search & Filtering:** Real-time search across questions, categories (`Engineering`, `Product`, `Design`, `General`), and status (`All`, `Popular`, `Unanswered`, `Answered`).
- **Resilient Dual-Mode WebSocket Engine:** Runs fully functional in local mode out of the box, or connects directly to an AWS API Gateway WebSocket backend when an endpoint is configured.

---

## Tech Stack

### Frontend
- **Framework:** Angular 21 (Standalone Components, Zoneless-ready)
- **State Management:** Angular Reactive Signals (`signal`, `computed`)
- **Real-Time Layer:** RxJS + native WebSocket API client with automatic reconnection
- **Styling:** Modular SCSS design system tokens, responsive CSS Grid / Flexbox

### Backend (AWS Serverless)
- **API Gateway:** WebSocket API with `$request.body.action` route selection
- **Compute:** AWS Lambda (Node.js 20.x, ESM, AWS SDK v3)
- **Database:** Amazon DynamoDB (On-Demand capacity with Global Secondary Indexes & TTL auto-cleanup)
- **Push Engine:** Amazon API Gateway Management API (`PostToConnectionCommand`)
- **Infrastructure as Code:** AWS SAM (`template.yaml`)

---

## Backend Architecture & AWS Setup

For the complete technical specification, DynamoDB table schemas, Lambda route handlers, and deployment templates for the backend team, see:

👉 **[BACKEND_ARCHITECTURE.md](file:///home/bethwel/ssui!/BACKEND_ARCHITECTURE.md)** (or relative: `BACKEND_ARCHITECTURE.md`)

### Overview of Backend Routes:
| Route Key | Direction | Description |
| :--- | :--- | :--- |
| `$connect` | Client ➔ AWS | Handshake registering `connectionId` and `roomCode` in DynamoDB |
| `$disconnect` | Client ➔ AWS | Deletes dropped `connectionId` from DynamoDB |
| `send_question` | Client ⇄ AWS | Validates room gate status, saves question, and broadcasts to room |
| `upvote_question` | Client ⇄ AWS | Performs atomic increment on upvotes and broadcasts updated tally |
| `toggle_qa` | Client ⇄ AWS | Host opens/pauses submissions and broadcasts state change to attendees |
| `mark_answered` | Client ⇄ AWS | Toggles question completion status and syncs clients |
| `vote_poll` | Client ⇄ AWS | Atomically tallies poll vote and pushes live percentage update |
| `sync_state` | Client ⇄ AWS | Returns current room questions and polls to caller on connect |

---

## Project Structure

```
ssui!/
├── BACKEND_ARCHITECTURE.md   # Complete AWS backend & SAM deployment guide
├── AWS_INTEGRATION_SPEC.md   # Integration payloads & DynamoDB contracts
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── navbar/             # Floating capsule navbar with room breadcrumb
│   │   │   ├── home-view/          # Landing view with room join CTAs & directory
│   │   │   ├── room-view/          # Interactive room view with attendee/creator modes
│   │   │   ├── question-card/      # Q&A item with upvote and moderation controls
│   │   │   ├── poll-widget/        # Community live poll widget
│   │   │   ├── filter-bar/         # Search, category pills, and sort dropdown
│   │   │   ├── ask-modal/          # New question dialog
│   │   │   ├── create-room-modal/  # Room creation dialog
│   │   │   ├── aws-settings-modal/ # WebSocket endpoint configuration
│   │   │   └── footer/             # Minimal footer with SSUI! watermark
│   │   ├── models/
│   │   │   ├── qna.model.ts        # Question, Poll, and WebSocket message interfaces
│   │   │   └── room.model.ts       # Room entity interfaces
│   │   ├── services/
│   │   │   ├── qna-store.service.ts # Signals-based questions & polls store
│   │   │   ├── room-store.service.ts# Signals-based room lifecycle & status store
│   │   │   └── websocket.service.ts # Resilient WS connection & local fallback
│   │   ├── app.ts                  # Root application component
│   │   ├── app.html                # App shell layout
│   │   └── app.scss                # Global layout rules
│   ├── index.html                  # HTML entry point with Plus Jakarta Sans
│   └── styles.scss                 # Design tokens, variables & animations
├── angular.json                    # Angular CLI configuration & build budgets
├── package.json                    # Project dependencies and scripts
└── tsconfig.json                   # TypeScript configuration
```

---

## Getting Started

### Prerequisites
- **Node.js:** `v20.x` or `v22.x`
- **npm:** `v10.x` or higher

### Installation
```bash
# Clone the repository
git clone https://github.com/bethwel3001/ssui.git
cd ssui

# Install dependencies
npm install
```

### Development Server
```bash
# Start local development server
npm start
```
Navigate to `http://localhost:4200/`. The application will automatically reload if you change any source files.

### Production Build
```bash
# Build optimized static assets
npm run build
```
Output files will be generated in the `dist/ssui/browser` directory.

---

## Connecting to Live AWS Infrastructure

1. Deploy the backend stack using the AWS SAM template in [BACKEND_ARCHITECTURE.md](file:///home/bethwel/ssui!/BACKEND_ARCHITECTURE.md).
2. Copy the resulting WebSocket URI (e.g., `wss://[api-id].execute-api.[region].amazonaws.com/prod`).
3. In the **ssui!** web app, click the **Settings** icon on the top-right of the navbar.
4. Paste the WebSocket URL and click **Save**. The app will immediately link to the AWS backend and begin syncing live messages.
