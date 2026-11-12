# ssui!

A clean, minimalist real-time Q&A and community polling board inspired by the [Mainstack](https://mainstack.com) design system.

---

## Features

- **Minimalist Aesthetic:** Clean cards, subtle hairline borders, neutral palette, and pure SVG iconography.
- **Upvoting (SSUI!):** Responsive upvote action with instant optimistic state updates.
- **Real-Time Polls:** Community poll widget with animated percentage bars.
- **Search & Filters:** Real-time search across questions, categories, and authors.
- **WebSocket Backend Ready:** Connects to AWS API Gateway WebSockets or runs locally if unconfigured.

---

## Development

```bash
# Start dev server
npm start

# Build for production
npm run build
```

---

## Backend Architecture & AWS Integration

The full architectural blueprint and deployment guide for the backend team is documented in [BACKEND_ARCHITECTURE.md](file:///home/bethwel/ssui!/BACKEND_ARCHITECTURE.md).

It covers:
- **API Gateway WebSockets:** Route selection, connection lifecycle (`$connect`, `$disconnect`).
- **DynamoDB Tables:** Room scoping, active connections with TTL, atomic upvote increments (`ADD upvotes :inc`).
- **Lambda Event Handlers:** Code examples with `@aws-sdk/client-dynamodb` and `@aws-sdk/client-apigatewaymanagementapi`.
- **Infrastructure as Code:** Ready-to-deploy AWS SAM (`template.yaml`) stack with IAM least-privilege roles.
- **Auto-Pruning:** Automatic cleanup of dropped sockets (`410 Gone`).
