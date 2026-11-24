# ssui! AWS backend guide

This folder contains the AWS SAM stack and WebSocket Lambda for the Angular app in the repository root. Deploying creates API Gateway, one Lambda function, and four DynamoDB tables in the selected AWS account and region. Review AWS pricing and set a billing budget before deploying; usage is pay-per-request, but AWS charges are not guaranteed to be zero.

## Prerequisites

Install Node.js 22 or newer, AWS CLI v2, and AWS SAM CLI. Configure the AWS CLI with an IAM identity for your account and the region you intend to use. Do not use root access keys, and never commit AWS credentials.

Check the tools:

```sh
node --version
aws --version
sam --version
aws sts get-caller-identity
```

## Validate and deploy

Run these commands from the repository root:

```sh
cd Backend
sam validate --lint
sam build
sam deploy --guided
```

For the guided prompts, use a stack name such as `ssui-backend`, choose your intended AWS region, keep `StageName` as `prod`, allow SAM to create the execution role, and save the settings. Review the change set and costs before confirming deployment. SAM prints `WebSocketURI` after deployment; copy it for the frontend settings modal.

The backend creates fixed table names (`ssui-connections`, `ssui-rooms`, `ssui-questions`, and `ssui-polls`), so only one copy of this stack can use those names in an account and region. Connection records expire after four hours. The endpoint routes messages by the `action` property, and the client selects its room by sending `sync_state` with `{ "roomCode": "..." }`.

## Connect the frontend

From the repository root:

```sh
npm install
npm start
```

Open `http://localhost:4200`, choose the settings control in the app, paste the `WebSocketURI`, and save. Join a room; the app syncs its questions and poll from the backend.

## Logs and cleanup

From `Backend/`, tail the function logs with:

```sh
sam logs --stack-name ssui-backend --tail
```

To remove the stack and its DynamoDB data when it is no longer needed:

```sh
sam delete --stack-name ssui-backend
```

Deleting the stack permanently removes its stored room, question, and poll data.

## Current access-control limits

Use the app's **Create a Q&A Room** flow to create a room with a private host token. The backend returns that token only to the creating connection, and the app keeps it in that browser's local storage to authorize moderation. Rooms that were auto-created before this route was deployed have no host token; migrate or remove those room records before using moderation there. Existing room codes cannot be claimed by creating another room.

Upvotes are limited by a persistent per-browser voter ID stored with each question. This prevents repeated votes from the same browser, but it is not identity verification: users can clear browser storage or use another device. Poll votes are still repeatable. Add Cognito or another authentication system and server-side vote records before using this for sensitive or high-stakes sessions.
