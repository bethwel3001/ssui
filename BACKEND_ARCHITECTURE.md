# ssui! — Serverless Backend Architecture & Implementation Guide

This document defines the complete backend architecture, data model, API contract, and deployment instructions for the **ssui!** real-time Q&A board on **AWS Serverless**.

---

## 1. Architectural Overview

```
                      [ Angular 21 Frontend (ssui!) ]
                                    ▲
                                    │ WebSocket (wss://)
                                    ▼
                [ Amazon API Gateway (WebSocket API) ]
                                    │
                         Route Selection Expression:
                           $request.body.action
                                    │
     ┌──────────────┬───────────────┼──────────────┬───────────────┐
     ▼              ▼               ▼              ▼               ▼
  $connect     $disconnect    send_question   upvote_question  toggle_qa
     │              │               │              │               │
     └──────────────┼───────────────┴──────────────┼───────────────┘
                    ▼                              ▼
          [ AWS Lambda Handlers ] ◄───► [ ApiGatewayManagementApi ]
                    │                         (PostToConnection)
                    ▼
       [ Amazon DynamoDB Single-Table / Multi-Table ]
         - ssui-connections (GSI on roomCode)
         - ssui-rooms
         - ssui-questions
         - ssui-polls
```

### Core Design Principles
1. **Zero Traditional Servers:** No EC2 instances, containers, or sticky connections to manage.
2. **Stateless Compute:** Event-driven AWS Lambda functions execute only when messages arrive or connections change.
3. **Room-Scoped Broadcasting:** Real-time messages are dispatched only to connections registered in that specific room code (e.g., `#tech-meetup`).
4. **Self-Healing Connections:** Disconnected sockets returning `410 Gone` during broadcast are immediately purged from DynamoDB.
5. **Free-Tier Friendly:** 100% serverless, costing ~$0.00 for normal conference sessions and meetups.

---

## 2. DynamoDB Data Modeling

We recommend an **Optimized Multi-Table Design** for simplicity, or a **Single-Table Design** if you prefer a single DynamoDB resource.

### Table 1: `ssui-connections`
Tracks active client WebSocket connections and their associated room.
- **Partition Key (PK):** `connectionId` (String)
- **Global Secondary Index (GSI1):**
  - **Partition Key:** `roomCode` (String)
  - **Projection:** `ALL`
- **Attributes:**
  - `connectedAt` (Number, timestamp)
  - `ttl` (Number, epoch seconds, e.g., now + 4 hours)

### Table 2: `ssui-rooms`
Stores room settings and live Q&A status.
- **Partition Key (PK):** `code` (String, e.g., `tech-meetup`)
- **Attributes:**
  - `name` (String)
  - `host` (String)
  - `description` (String)
  - `isQaOpen` (Boolean) — *Controls whether attendees can submit questions*
  - `createdAt` (Number)

### Table 3: `ssui-questions`
Stores submitted questions.
- **Partition Key (PK):** `roomCode` (String)
- **Sort Key (SK):** `id` (String, e.g., `q-1731427200`)
- **Attributes:**
  - `author` (String)
  - `content` (String)
  - `category` (String: `Engineering` | `Product` | `Design` | `General`)
  - `upvotes` (Number, updated via atomic ADD)
  - `createdAt` (Number)
  - `isAnswered` (Boolean)
  - `isPinned` (Boolean)

### Table 4: `ssui-polls`
Stores room community polls.
- **Partition Key (PK):** `roomCode` (String)
- **Sort Key (SK):** `id` (String)
- **Attributes:**
  - `question` (String)
  - `options` (List of Map: `{ id: string, text: string, votes: number }`)
  - `totalVotes` (Number)
  - `isActive` (Boolean)

---

## 3. WebSocket Route Handlers

API Gateway routes incoming JSON frames based on `$request.body.action`.

### Route 1: `$connect`
Triggered when a client establishes a WebSocket connection.
- **Client URL:** `wss://[api-id].execute-api.[region].amazonaws.com/[stage]?room=tech-meetup`
- **Lambda Logic:**
  ```javascript
  import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
  const ddb = new DynamoDBClient({});

  export const handler = async (event) => {
    const connectionId = event.requestContext.connectionId;
    const roomCode = event.queryStringParameters?.room || 'general';

    await ddb.send(new PutItemCommand({
      TableName: "ssui-connections",
      Item: {
        connectionId: { S: connectionId },
        roomCode: { S: roomCode.toLowerCase() },
        connectedAt: { N: Date.now().toString() },
        ttl: { N: Math.floor(Date.now() / 1000 + 14400).toString() } // 4 hour TTL
      }
    }));

    return { statusCode: 200, body: "Connected." };
  };
  ```

### Route 2: `$disconnect`
Triggered when a client closes or drops connection.
- **Lambda Logic:**
  ```javascript
  import { DynamoDBClient, DeleteItemCommand } from "@aws-sdk/client-dynamodb";
  const ddb = new DynamoDBClient({});

  export const handler = async (event) => {
    const connectionId = event.requestContext.connectionId;

    await ddb.send(new DeleteItemCommand({
      TableName: "ssui-connections",
      Key: { connectionId: { S: connectionId } }
    }));

    return { statusCode: 200, body: "Disconnected." };
  };
  ```

### Route 3: `send_question`
An attendee submits a new question to the room.
- **Client Payload:**
  ```json
  {
    "action": "send_question",
    "payload": {
      "id": "q-m3k8z1",
      "roomCode": "tech-meetup",
      "author": "Daniel",
      "content": "Can we support custom domain mapping for public spaces?",
      "category": "Engineering",
      "upvotes": 1,
      "createdAt": 1731427200000,
      "isAnswered": false,
      "isPinned": false
    }
  }
  ```
- **Backend Flow:**
  1. Fetch room from `ssui-rooms` to verify `isQaOpen === true`. If `false`, return error to caller: *"Q&A is currently paused by the host."*
  2. Put item into `ssui-questions`.
  3. Query `ssui-connections` GSI1 for all sockets with `roomCode === payload.roomCode`.
  4. Broadcast `{ action: "send_question", payload: question }` to all connections.

### Route 4: `upvote_question`
Attendee triggers an upvote ("SSUI!").
- **Client Payload:**
  ```json
  {
    "action": "upvote_question",
    "payload": {
      "questionId": "q-m3k8z1",
      "roomCode": "tech-meetup",
      "newCount": 49
    }
  }
  ```
- **Backend Flow:**
  1. Atomic DynamoDB update:
     ```javascript
     UpdateExpression: "ADD upvotes :inc",
     ExpressionAttributeValues: { ":inc": { N: "1" } }
     ```
  2. Broadcast `{ action: "upvote_question", payload: { questionId, newCount } }` to the room.

### Route 5: `toggle_qa` (Host Control)
The room creator/host pauses or opens question submissions.
- **Client Payload:**
  ```json
  {
    "action": "toggle_qa",
    "payload": {
      "roomCode": "tech-meetup",
      "isOpen": false
    }
  }
  ```
- **Backend Flow:**
  1. Update `ssui-rooms` set `isQaOpen = :isOpen`.
  2. Broadcast `{ action: "toggle_qa", payload: { roomCode, isOpen } }` to all clients in the room.

### Route 6: `mark_answered` (Host Control)
Host marks a question as answered or moves it back to unanswered.
- **Client Payload:**
  ```json
  {
    "action": "mark_answered",
    "payload": {
      "questionId": "q-m3k8z1",
      "roomCode": "tech-meetup",
      "isAnswered": true
    }
  }
  ```
- **Backend Flow:**
  1. Update `isAnswered` attribute in `ssui-questions`.
  2. Broadcast `{ action: "mark_answered", payload: { questionId, isAnswered } }`.

### Route 7: `vote_poll`
Attendee submits a vote on a live poll option.
- **Client Payload:**
  ```json
  {
    "action": "vote_poll",
    "payload": {
      "roomCode": "tech-meetup",
      "optionId": "opt-1"
    }
  }
  ```
- **Backend Flow:**
  1. Increment `totalVotes` and target option votes.
  2. Broadcast `{ action: "vote_poll", payload: { optionId } }`.

### Route 8: `sync_state`
Sent immediately upon client connect to load current questions and room state.
- **Client Payload:** `{ "action": "sync_state", "payload": { "roomCode": "tech-meetup" } }`
- **Backend Flow:** Returns active questions and poll directly to the caller's `connectionId`.

---

## 4. Broadcasting Utility & Auto-Pruning

When broadcasting to clients in a room, handle dropped sockets automatically:

```javascript
import { 
  ApiGatewayManagementApiClient, 
  PostToConnectionCommand,
  GoneException 
} from "@aws-sdk/client-apigatewaymanagementapi";
import { DynamoDBClient, DeleteItemCommand } from "@aws-sdk/client-dynamodb";

const ddb = new DynamoDBClient({});

export async function broadcastToRoom(endpoint, connections, message) {
  const apigw = new ApiGatewayManagementApiClient({ endpoint });
  const rawData = Buffer.from(JSON.stringify(message));

  const sendPromises = connections.map(async ({ connectionId }) => {
    try {
      await apigw.send(new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: rawData
      }));
    } catch (err) {
      if (err.name === "GoneException" || err.$metadata?.httpStatusCode === 410) {
        // Socket closed without calling $disconnect: prune from DynamoDB
        await ddb.send(new DeleteItemCommand({
          TableName: "ssui-connections",
          Key: { connectionId: { S: connectionId } }
        }));
      } else {
        console.error(`Failed to send to ${connectionId}:`, err);
      }
    }
  });

  await Promise.allSettled(sendPromises);
}
```

---

## 5. Infrastructure as Code (AWS SAM Template)

Your backend team can deploy this entire stack with AWS SAM using the template below:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: ssui! Real-time WebSocket Serverless Infrastructure

Resources:
  # 1. API Gateway WebSocket API
  SsuiWebSocketApi:
    Type: AWS::ApiGatewayV2::Api
    Properties:
      Name: ssui-websocket-api
      ProtocolType: WEBSOCKET
      RouteSelectionExpression: "$request.body.action"

  # 2. DynamoDB Tables
  ConnectionsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: ssui-connections
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: connectionId
          AttributeType: S
        - AttributeName: roomCode
          AttributeType: S
      KeySchema:
        - AttributeName: connectionId
          KeyType: HASH
      GlobalSecondaryIndexes:
        - IndexName: RoomIndex
          KeySchema:
            - AttributeName: roomCode
              KeyType: HASH
          Projection:
            ProjectionType: ALL
      TimeToLiveSpecification:
        AttributeName: ttl
        Enabled: true

  RoomsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: ssui-rooms
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: code
          AttributeType: S
      KeySchema:
        - AttributeName: code
          KeyType: HASH

  QuestionsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: ssui-questions
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: roomCode
          AttributeType: S
        - AttributeName: id
          AttributeType: S
      KeySchema:
        - AttributeName: roomCode
          KeyType: HASH
        - AttributeName: id
          KeyType: RANGE

  # 3. Main Message Handler Lambda Function
  WsHandlerFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: index.handler
      Runtime: nodejs20.x
      Timeout: 10
      MemorySize: 256
      Environment:
        VARIABLES:
          CONNECTIONS_TABLE: !Ref ConnectionsTable
          ROOMS_TABLE: !Ref RoomsTable
          QUESTIONS_TABLE: !Ref QuestionsTable
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref ConnectionsTable
        - DynamoDBCrudPolicy:
            TableName: !Ref RoomsTable
        - DynamoDBCrudPolicy:
            TableName: !Ref QuestionsTable
        - Statement:
            - Effect: Allow
              Action:
                - 'execute-api:ManageConnections'
              Resource: !Sub 'arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${SsuiWebSocketApi}/*'

Outputs:
  WebSocketURI:
    Description: "WSS Endpoint for ssui! frontend"
    Value: !Sub "wss://${SsuiWebSocketApi}.execute-api.${AWS::Region}.amazonaws.com/prod"
```

---

## 6. Frontend Handoff Checklist

When your backend team finishes deploying:
1. Run `sam deploy` (or `serverless deploy`).
2. Copy the output `WebSocketURI` (e.g. `wss://xxxx.execute-api.us-east-1.amazonaws.com/prod`).
3. In **ssui!**, open the **Settings** icon on the top-right of the floating navbar.
4. Paste the URL and click **Save**. The frontend will immediately connect and begin real-time two-way synchronization.
