import * as express from "express";
import * as serverless from "serverless-http";
import axios from "axios";
import { ITEMS, ENDPOINTS, ENV } from "../constants";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import {
  Errors,
  StravaAccessTokenRequest,
  StravaNewTokenResponse,
  User,
} from "../types";
import { Err, Ok, Result } from "ts-results";
import { dbPut } from "../db";

const app = express();

app.use(express.json());

app.get("/user", async function (req, res) {
  let code = req.query["code"] as string;
  let scope = req.query["scope"] as string[];
  if (!code || !scope) {
    console.log("Code or Scope missing");
    res.sendStatus(400);
    return;
  }

  console.log("NEW USER");

  const scopeValid = validateScope(scope);
  if (!scopeValid) {
    res.status(400).json({ error: "SCOPE_INVALID" });
  }

  try {
    const tokenResult = await generateTokens(code);
    if (tokenResult.err) {
      let err = tokenResult.val;
      res.status(err.code).json({ error: err.message });
      return;
    }

    const user = tokenResult.val;
    console.log(user);
    const saveResult = await saveNewUser(user);
    if (saveResult.err) {
      let err = saveResult.val;
      res.status(err.code).json({ error: err.message });
      return;
    }

    res.status(201).json({ message: "USER_CREATED" });
    return;
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "UNEXPECTED_ERROR" });
    return;
  }
});

// TODO
const validateScope = (scope: string[]): boolean => {
  console.log(`Scope: ${scope}`);
  return true;
};

const generateTokens = async (
  code: string
): Promise<Result<StravaNewTokenResponse, Errors>> => {
  const params: StravaAccessTokenRequest = {
    client_id: ENV.CLIENT_ID,
    client_secret: ENV.CLIENT_SECRET,
    code,
    grant_type: "authorization_code",
  };

  try {
    const response = await axios.post(ENDPOINTS.TOKEN, {}, { params });
    return Ok(response.data as StravaNewTokenResponse);
  } catch (error) {
    console.error(error);
    return Err({ code: 500, message: "ACCESS_TOKEN_GENERATION_FAILED" });
  }
};

const saveNewUser = async (
  user: StravaNewTokenResponse
): Promise<Result<void, Errors>> => {
  const id = ITEMS.USER.prefix + user.athlete.id;
  const newUser: User = {
    PK: id,
    SK: id,
    Type: ITEMS.USER.type,
    userId: user.athlete.id,
    username: user.athlete.username,
    accessToken: user.access_token,
    refreshToken: user.refresh_token,
    expiresAt: user.expires_at,
    firstname: user.athlete.firstname,
    lastname: user.athlete.lastname,
    sex: user.athlete.sex,
  };
  const params: DocumentClient.PutItemInput = {
    TableName: ENV.USERS_TABLE,
    Item: newUser,
  };

  try {
    await dbPut(params);
    return Ok.EMPTY;
  } catch (error) {
    console.log(error);
    return Err({ code: 500, message: "DB_ERROR" });
  }
};

export const handler = serverless(app);
