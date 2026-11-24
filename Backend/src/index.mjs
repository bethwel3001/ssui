import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { randomBytes } from "node:crypto";
import { DynamoDBDocumentClient, DeleteCommand, GetCommand, PutCommand, QueryCommand, UpdateCommand, } from "@aws-sdk/lib-dynamodb";
import { ApiGatewayManagementApiClient, PostToConnectionCommand, } from "@aws-sdk/client-apigatewaymanagementapi";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});
const TABLES = {
  connections: process.env.CONNECTIONS_TABLE,
  rooms: process.env.ROOMS_TABLE,
  questions: process.env.QUESTIONS_TABLE,
  polls: process.env.POLLS_TABLE,
};
const TTL_SECONDS = 4 * 60 * 60;

function cleanRoom(value) {
  const code = String(value ?? "").trim().replace(/^#/, "").toLowerCase();
  return /^[a-z0-9_-]{1,40}$/.test(code) ? code : "general";
}

function cleanText(value, maxLength) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function makeApi(event) {
  const { domainName, stage } = event.requestContext;
  return new ApiGatewayManagementApiClient({ endpoint: `https://${domainName}/${stage}` });
}

async function sendTo(api, connectionId, message) {
  try {
    await api.send(new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: Buffer.from(JSON.stringify(message)),
    }));
    return true;
  } catch (error) {
    if (error.name === "GoneException" || error.$metadata?.httpStatusCode === 410) {
      await ddb.send(new DeleteCommand({
        TableName: TABLES.connections,
        Key: { connectionId },
      }));
      return false;
    }
    console.error("WebSocket delivery failed", connectionId, error);
    return false;
  }
}

async function broadcast(api, roomCode, message) {
  const result = await ddb.send(new QueryCommand({
    TableName: TABLES.connections,
    IndexName: "RoomIndex",
    KeyConditionExpression: "roomCode = :room",
    ExpressionAttributeValues: { ":room": roomCode },
  }));
  await Promise.allSettled((result.Items ?? []).map(({ connectionId }) =>
    sendTo(api, connectionId, message)));
}

async function getConnection(connectionId) {
  const result = await ddb.send(new GetCommand({
    TableName: TABLES.connections,
    Key: { connectionId },
  }));
  return result.Item;
}

async function ensureRoom(code) {
  try {
    await ddb.send(new PutCommand({
      TableName: TABLES.rooms,
      Item: { code, name: code, isQaOpen: true, createdAt: Date.now() },
      ConditionExpression: "attribute_not_exists(code)",
    }));
  } catch (error) {
    if (error.name !== "ConditionalCheckFailedException") throw error;
  }
  const result = await ddb.send(new GetCommand({ TableName: TABLES.rooms, Key: { code } }));
  return result.Item;
}

async function listByRoom(tableName, roomCode) {
  const result = await ddb.send(new QueryCommand({
    TableName: tableName,
    KeyConditionExpression: "roomCode = :room",
    ExpressionAttributeValues: { ":room": roomCode },
  }));
  return result.Items ?? [];
}

function publicQuestion(question) {
  const { voters, ...visibleQuestion } = question;
  return visibleQuestion;
}

async function hostAllowed(roomCode, payload) {
  const result = await ddb.send(new GetCommand({ TableName: TABLES.rooms, Key: { code: roomCode } }));
  return Boolean(result.Item?.hostToken && payload?.hostToken === result.Item.hostToken);
}

async function errorTo(api, connectionId, message) {
  return sendTo(api, connectionId, { action: "error", payload: { message } });
}

const routes = {
  async sync_state({ api, connectionId, payload }) {
    const requestedRoom = payload?.roomCode ? cleanRoom(payload.roomCode) : null;
    const connection = await getConnection(connectionId);
    const roomCode = requestedRoom ?? connection?.roomCode ?? "general";
    if (connection && roomCode !== connection.roomCode) {
      await ddb.send(new UpdateCommand({
        TableName: TABLES.connections,
        Key: { connectionId },
        UpdateExpression: "SET roomCode = :room",
        ExpressionAttributeValues: { ":room": roomCode },
      }));
    }
    const room = await ensureRoom(roomCode);
    const [storedQuestions, polls] = await Promise.all([
      listByRoom(TABLES.questions, roomCode),
      listByRoom(TABLES.polls, roomCode),
    ]);
    const questions = storedQuestions.map(publicQuestion);
    const poll = polls.find((item) => item.isActive) ?? polls[0] ?? null;
    await sendTo(api, connectionId, {
      action: "sync_state",
      payload: { roomCode, isQaOpen: room.isQaOpen, questions, poll, polls },
    });
  },

  async create_room({ api, connectionId, payload }) {
    const rawCode = String(payload?.roomCode ?? "").trim().replace(/^#/, "").toLowerCase();
    if (!/^[a-z0-9_-]{1,40}$/.test(rawCode)) return errorTo(api, connectionId, "Choose a valid room code before creating the room.");
    const hostToken = randomBytes(32).toString("base64url");
    const room = {
      code: rawCode,
      name: cleanText(payload?.name, 80) || rawCode,
      host: cleanText(payload?.host, 40) || "Host",
      description: cleanText(payload?.description, 300),
      isQaOpen: true,
      createdAt: Date.now(),
      hostToken,
    };
    try {
      await ddb.send(new PutCommand({
        TableName: TABLES.rooms,
        Item: room,
        ConditionExpression: "attribute_not_exists(code)",
      }));
    } catch (error) {
      if (error.name === "ConditionalCheckFailedException") {
        return errorTo(api, connectionId, "That room code is already in use. Choose another code or join the existing room.");
      }
      throw error;
    }
    await ddb.send(new UpdateCommand({
      TableName: TABLES.connections,
      Key: { connectionId },
      UpdateExpression: "SET roomCode = :room",
      ExpressionAttributeValues: { ":room": rawCode },
    }));
    await sendTo(api, connectionId, {
      action: "room_created",
      payload: {
        room: { code: room.code, name: room.name, host: room.host, description: room.description, isQaOpen: true, createdAt: room.createdAt },
        hostToken,
      },
    });
  },

  async send_question({ api, connectionId, roomCode, payload }) {
    const room = await ensureRoom(roomCode);
    if (!room.isQaOpen) return errorTo(api, connectionId, "Q&A is currently paused by the host.");
    const content = cleanText(payload?.content, 500);
    if (!content) return errorTo(api, connectionId, "Question cannot be empty.");
    const question = {
      roomCode,
      id: /^[\w-]{1,40}$/.test(payload?.id ?? "") ? payload.id : `q-${Date.now().toString(36)}`,
      author: cleanText(payload?.author, 40) || "Anonymous",
      content,
      category: cleanText(payload?.category, 30) || "General",
      upvotes: 1,
      createdAt: Date.now(),
      isAnswered: false,
      isPinned: false,
    };
    try {
      await ddb.send(new PutCommand({
        TableName: TABLES.questions,
        Item: question,
        ConditionExpression: "attribute_not_exists(id)",
      }));
    } catch (error) {
      if (error.name === "ConditionalCheckFailedException") return;
      throw error;
    }
    await broadcast(api, roomCode, { action: "send_question", payload: publicQuestion(question) });
  },

  async upvote_question({ api, connectionId, roomCode, payload }) {
    const questionId = cleanText(payload?.questionId, 40);
    const voterId = cleanText(payload?.voterId, 80);
    if (!questionId || !/^[a-zA-Z0-9_-]{16,80}$/.test(voterId)) return;
    try {
      const result = await ddb.send(new UpdateCommand({
        TableName: TABLES.questions,
        Key: { roomCode, id: questionId },
        UpdateExpression: "ADD upvotes :one, voters :voterSet",
        ConditionExpression: "attribute_exists(id) AND (attribute_not_exists(voters) OR NOT contains(voters, :voterId))",
        ExpressionAttributeValues: { ":one": 1, ":voterSet": new Set([voterId]), ":voterId": voterId },
        ReturnValues: "UPDATED_NEW",
      }));
      await broadcast(api, roomCode, {
        action: "upvote_question",
        payload: { questionId, roomCode, newCount: result.Attributes.upvotes },
      });
    } catch (error) {
      if (error.name === "ConditionalCheckFailedException") {
        const existing = await ddb.send(new GetCommand({ TableName: TABLES.questions, Key: { roomCode, id: questionId } }));
        if (existing.Item) {
          await sendTo(api, connectionId, { action: "upvote_question", payload: { questionId, roomCode, newCount: existing.Item.upvotes } });
        }
        return;
      }
      throw error;
    }
  },

  async toggle_qa({ api, connectionId, roomCode, payload }) {
    if (!(await hostAllowed(roomCode, payload))) return errorTo(api, connectionId, "Only the host can do that.");
    const isOpen = Boolean(payload?.isOpen);
    await ensureRoom(roomCode);
    await ddb.send(new UpdateCommand({
      TableName: TABLES.rooms,
      Key: { code: roomCode },
      UpdateExpression: "SET isQaOpen = :open",
      ExpressionAttributeValues: { ":open": isOpen },
    }));
    await broadcast(api, roomCode, { action: "toggle_qa", payload: { roomCode, isOpen } });
  },

  async mark_answered({ api, connectionId, roomCode, payload }) {
    if (!(await hostAllowed(roomCode, payload))) return errorTo(api, connectionId, "Only the host can do that.");
    const questionId = cleanText(payload?.questionId, 40);
    try {
      await ddb.send(new UpdateCommand({
        TableName: TABLES.questions,
        Key: { roomCode, id: questionId },
        UpdateExpression: "SET isAnswered = :answered",
        ConditionExpression: "attribute_exists(id)",
        ExpressionAttributeValues: { ":answered": Boolean(payload?.isAnswered) },
      }));
      await broadcast(api, roomCode, {
        action: "mark_answered",
        payload: { questionId, roomCode, isAnswered: Boolean(payload?.isAnswered) },
      });
    } catch (error) {
      if (error.name !== "ConditionalCheckFailedException") throw error;
    }
  },

  async pin_question({ api, connectionId, roomCode, payload }) {
    if (!(await hostAllowed(roomCode, payload))) return errorTo(api, connectionId, "Only the host can do that.");
    const questionId = cleanText(payload?.questionId, 40);
    try {
      await ddb.send(new UpdateCommand({
        TableName: TABLES.questions,
        Key: { roomCode, id: questionId },
        UpdateExpression: "SET isPinned = :pinned",
        ConditionExpression: "attribute_exists(id)",
        ExpressionAttributeValues: { ":pinned": Boolean(payload?.isPinned) },
      }));
      await broadcast(api, roomCode, {
        action: "pin_question",
        payload: { questionId, roomCode, isPinned: Boolean(payload?.isPinned) },
      });
    } catch (error) {
      if (error.name !== "ConditionalCheckFailedException") throw error;
    }
  },

  async delete_question({ api, connectionId, roomCode, payload }) {
    if (!(await hostAllowed(roomCode, payload))) return errorTo(api, connectionId, "Only the host can do that.");
    const questionId = cleanText(payload?.questionId, 40);
    await ddb.send(new DeleteCommand({ TableName: TABLES.questions, Key: { roomCode, id: questionId } }));
    await broadcast(api, roomCode, { action: "delete_question", payload: { questionId, roomCode } });
  },

  async create_poll({ api, connectionId, roomCode, payload }) {
    if (!(await hostAllowed(roomCode, payload))) return errorTo(api, connectionId, "Only the host can do that.");
    const question = cleanText(payload?.question, 200);
    const labels = (Array.isArray(payload?.options) ? payload.options : [])
      .map((option) => cleanText(typeof option === "string" ? option : option?.text, 80))
      .filter(Boolean).slice(0, 6);
    if (!question || labels.length < 2) return errorTo(api, connectionId, "A poll needs a question and at least 2 options.");
    const polls = await listByRoom(TABLES.polls, roomCode);
    for (const previous of polls.filter((item) => item.isActive)) {
      await ddb.send(new UpdateCommand({
        TableName: TABLES.polls,
        Key: { roomCode, id: previous.id },
        UpdateExpression: "SET isActive = :inactive",
        ExpressionAttributeValues: { ":inactive": false },
      }));
    }
    const id = `poll-${Date.now().toString(36)}`;
    const poll = {
      roomCode, id, question, isActive: true, totalVotes: 0,
      options: labels.map((text, index) => ({ id: `opt-${index + 1}`, text, votes: 0 })),
    };
    await ddb.send(new PutCommand({ TableName: TABLES.polls, Item: poll }));
    await broadcast(api, roomCode, { action: "create_poll", payload: { poll } });
  },

  async vote_poll({ api, roomCode, payload }) {
    const optionId = cleanText(payload?.optionId, 40);
    const polls = await listByRoom(TABLES.polls, roomCode);
    const poll = polls.find((item) => item.isActive && item.options?.some((option) => option.id === optionId));
    if (!poll) return;
    const index = poll.options.findIndex((option) => option.id === optionId);
    try {
      const result = await ddb.send(new UpdateCommand({
        TableName: TABLES.polls,
        Key: { roomCode, id: poll.id },
        UpdateExpression: `SET #options[${index}].votes = #options[${index}].votes + :one, totalVotes = totalVotes + :one`,
        ConditionExpression: `isActive = :active AND #options[${index}].id = :optionId`,
        ExpressionAttributeNames: { "#options": "options" },
        ExpressionAttributeValues: { ":one": 1, ":active": true, ":optionId": optionId },
        ReturnValues: "ALL_NEW",
      }));
      await broadcast(api, roomCode, {
        action: "vote_poll",
        payload: { roomCode, poll: result.Attributes, optionId },
      });
    } catch (error) {
      if (error.name !== "ConditionalCheckFailedException") throw error;
    }
  },
};

export const handler = async (event) => {
  const { routeKey, connectionId } = event.requestContext;
  try {
    if (routeKey === "$connect") {
      const roomCode = cleanRoom(event.queryStringParameters?.room);
      await ddb.send(new PutCommand({
        TableName: TABLES.connections,
        Item: {
          connectionId, roomCode, connectedAt: Date.now(),
          ttl: Math.floor(Date.now() / 1000) + TTL_SECONDS,
        },
      }));
      return { statusCode: 200, body: "Connected." };
    }
    if (routeKey === "$disconnect") {
      await ddb.send(new DeleteCommand({ TableName: TABLES.connections, Key: { connectionId } }));
      return { statusCode: 200, body: "Disconnected." };
    }

    const api = makeApi(event);
    let message;
    try {
      message = JSON.parse(event.body ?? "{}");
    } catch {
      await errorTo(api, connectionId, "Invalid JSON.");
      return { statusCode: 400, body: "Invalid JSON." };
    }
    const action = routeKey === "$default" ? message.action : routeKey;
    const route = routes[action];
    if (!route) {
      await errorTo(api, connectionId, `Unknown action: ${action}`);
      return { statusCode: 400, body: "Unknown action." };
    }
    const connection = await getConnection(connectionId);
    await route({ api, connectionId, roomCode: connection?.roomCode ?? "general", payload: message.payload ?? {} });
    return { statusCode: 200, body: "OK" };
  } catch (error) {
    console.error(`Route ${routeKey} failed`, error);
    return { statusCode: 500, body: "Server error." };
  }
};
