# AWS Serverless WebSocket Specification for ssui!

This document is the integration guide and API contract for the backend team handling the AWS deployment for **ssui!**.

---

## 🏛 Architecture Overview

```
[ Angular 21 (ssui!) ]
         ▲
         │ WebSocket (wss://)
         ▼
[ Amazon API Gateway WebSocket API ]
         │ Route Selection: $request.body.action
         ├──► $connect        ──► Lambda (Save connectionId to DynamoDB)
         ├──► $disconnect     ──► Lambda (Delete connectionId from DynamoDB)
         ├──► send_question   ──► Lambda (Save question to DynamoDB + Broadcast)
         ├──► upvote_question ──► Lambda (Atomic ADD in DynamoDB + Broadcast)
         ├──► mark_answered   ──► Lambda (Update DynamoDB + Broadcast)
         ├──► vote_poll       ──► Lambda (Increment option votes + Broadcast)
         └──► sync_state      ──► Lambda (Return active questions & poll to caller)
                                     │
                                     ▼
                          [ Amazon DynamoDB Tables ]
                          1. ssui-connections
                          2. ssui-questions
                          3. ssui-polls
```

---

## 🔑 Route Selection Expression

Configure your API Gateway WebSocket route selection expression to:
```
$request.body.action
```

---

## 📡 Message Payload Specifications

All messages sent from the client or broadcasted by Lambda use JSON format with an `action` and `payload` envelope:

### 1. `$connect`
- **Triggered by:** API Gateway on client connection.
- **Lambda task:**
  ```javascript
  const connectionId = event.requestContext.connectionId;
  await dynamo.put({
    TableName: 'ssui-connections',
    Item: {
      connectionId,
      connectedAt: Date.now(),
      ttl: Math.floor(Date.now() / 1000) + 7200 // 2hr TTL cleanup
    }
  });
  return { statusCode: 200 };
  ```

### 2. `$disconnect`
- **Triggered by:** API Gateway on client disconnect.
- **Lambda task:**
  ```javascript
  const connectionId = event.requestContext.connectionId;
  await dynamo.delete({
    TableName: 'ssui-connections',
    Key: { connectionId }
  });
  return { statusCode: 200 };
  ```

### 3. `sync_state`
- **Triggered by:** Frontend right after connection opens.
- **Client Payload:**
  ```json
  {
    "action": "sync_state",
    "payload": {}
  }
  ```
- **Lambda response:** Send back to calling `connectionId`:
  ```json
  {
    "action": "sync_state",
    "payload": {
      "questions": [ ...all questions... ],
      "poll": { ...active poll... }
    }
  }
  ```

### 4. `send_question`
- **Client Payload:**
  ```json
  {
    "action": "send_question",
    "payload": {
      "id": "q-xyz123",
      "author": "Sarah",
      "content": "How do you handle WebSocket connection ID cleanup in DynamoDB?",
      "category": "AWS",
      "upvotes": 1,
      "createdAt": 1731427200000,
      "isAnswered": false,
      "isPinned": false
    }
  }
  ```
- **Lambda task:**
  1. Save item to `ssui-questions` DynamoDB table.
  2. Broadcast the message to all active `connectionId`s using `@aws-sdk/client-apigatewaymanagementapi` (`PostToConnectionCommand`).
  3. If a connection ID returns `410 Gone`, remove it from `ssui-connections`.

### 5. `upvote_question`
- **Client Payload:**
  ```json
  {
    "action": "upvote_question",
    "payload": {
      "questionId": "q-xyz123",
      "newCount": 24
    }
  }
  ```
- **Lambda task:**
  1. Update `ssui-questions` with `UpdateExpression: "ADD upvotes :val"`.
  2. Broadcast `{ "action": "upvote_question", "payload": { "questionId": "q-xyz123", "newCount": 24 } }`.

### 6. `mark_answered`
- **Client Payload:**
  ```json
  {
    "action": "mark_answered",
    "payload": {
      "questionId": "q-xyz123",
      "isAnswered": true
    }
  }
  ```
- **Lambda task:** Update `isAnswered` attribute in DynamoDB and broadcast.

### 7. `vote_poll`
- **Client Payload:**
  ```json
  {
    "action": "vote_poll",
    "payload": {
      "optionId": "opt-1"
    }
  }
  ```
- **Lambda task:** Increment vote count for `optionId` and broadcast to all connections.

---

## 🗄 DynamoDB Table Schemas

### Table 1: `ssui-connections`
- **Partition Key:** `connectionId` (String)
- **TTL Attribute:** `ttl` (Number)

### Table 2: `ssui-questions`
- **Partition Key:** `id` (String)
- **Attributes:**
  - `author` (String)
  - `content` (String)
  - `category` (String)
  - `upvotes` (Number)
  - `createdAt` (Number)
  - `isAnswered` (Boolean)
  - `isPinned` (Boolean, optional)

### Table 3: `ssui-polls`
- **Partition Key:** `id` (String)
- **Attributes:**
  - `question` (String)
  - `isActive` (Boolean)
  - `totalVotes` (Number)
  - `options` (List)

---

## 🚀 How to Hand Off the Endpoint

Once deployed, copy your WebSocket URL:
```
wss://[api-id].execute-api.[region].amazonaws.com/[stage]
```
In the **ssui!** frontend:
1. Click the status badge in the top navbar (`⚙️ Demo Simulator`).
2. Select **Live AWS API Gateway WebSocket**.
3. Paste the URL and click **Save & Reconnect**.
