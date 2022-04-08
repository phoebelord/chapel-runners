"use strict";

import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import * as express from "express";
import * as serverless from "serverless-http";
import { Ok, Result } from "ts-results";
import { ENV } from "../constants";
import { Errors, WebhookEvent } from "../types";
import { handleActivity } from "./handleActivity";

const app = express();

app.use(express.json());

app.get("/webhook", async function (req, res) {
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];
  if (mode && token) {
    if (mode === "subscribe" && token === ENV.VERIFY_TOKEN) {
      console.log("WEBHOOK_VERIFIED");
      res.json({ "hub.challenge": challenge });
      return;
    } else {
      res.sendStatus(403);
      return;
    }
  }
  res.sendStatus(400);
});

app.post("/webhook", async function (req, res) {
  console.log("webhook event received!", req.query, req.body);
  const event: WebhookEvent = req.body;

  try {
    let result: Result<void, Errors>;
    if (event.object_type === "activity") {
      result = await handleActivity(event);
    } else {
      result = await handleAthlete(event);
    }

    if (result.err) {
      const err = result.val;
      res.status(err.code).json({ error: err.message });
      return;
    }

    res.status(200).json({ message: "EVENT_PROCESSED" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "UNEXPECTED_ERROR" });
  }
});

const handleAthlete = async (
  event: WebhookEvent
): Promise<Result<void, Errors>> => {
  console.log("User Event", event);
  return Promise.resolve(Ok.EMPTY);
};

app.use((req, res) => {
  return res.status(404).json({
    error: "Not Found",
  });
});

const sls = serverless(app);

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  const response = await sls(event, context);
  return response;
};
