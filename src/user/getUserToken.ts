import { DocumentClient } from "aws-sdk/clients/dynamodb";
import axios from "axios";
import * as dayjs from "dayjs";
import { Err, Ok, Result } from "ts-results";
import { ITEMS, ENDPOINTS, ENV } from "../constants";
import { dbUpdate } from "../db";
import {
  Errors,
  StravaRefreshTokenRequest,
  StravaRefreshTokenResponse,
} from "../types";
import { fetchUser } from "./fetchUser";

export const getUserToken = async (
  userId: number
): Promise<Result<string, Errors>> => {
  console.log("Fetching token for user: ", userId);
  const userResult = await fetchUser(userId);
  if (userResult.err) {
    return userResult;
  }

  const user = userResult.val;
  console.log("Got user");
  const expirationDate = dayjs.unix(user.expiresAt);
  if (expirationDate.isAfter(dayjs())) {
    console.log("Token still valid");
    return Ok(user.accessToken);
  } else {
    const tokenResult = await getNewRefreshToken(user.refreshToken);
    if (tokenResult.err) {
      return tokenResult;
    }

    const newToken = tokenResult.val;
    console.log("Got new token ... updating user");

    const updateResult = await updateUserToken(
      userId,
      newToken.access_token,
      newToken.refresh_token,
      newToken.expires_at
    );

    if (updateResult.err) {
      return updateResult;
    }
    console.log("Updated user");
    return Ok(newToken.access_token);
  }
};

const getNewRefreshToken = async (
  token: string
): Promise<Result<StravaRefreshTokenResponse, Errors>> => {
  const params: StravaRefreshTokenRequest = {
    client_id: ENV.CLIENT_ID,
    client_secret: ENV.CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: token,
  };
  console.log("Requesting refresh token");
  try {
    const response = await axios.post(ENDPOINTS.TOKEN, {}, { params });
    return Ok(response.data as StravaRefreshTokenResponse);
  } catch (error) {
    console.error(error);
    let code = 500;

    if (axios.isAxiosError(error) && error.response) {
      code = error.response.status;
    }

    return Err({ code, message: "REFRESH_TOKEN_GENERATION_FAILED" });
  }
};

const updateUserToken = async (
  userId: number,
  accessToken: string,
  refreshToken: string,
  expiresAt: number
): Promise<Result<void, Errors>> => {
  const params: DocumentClient.UpdateItemInput = {
    TableName: ENV.USERS_TABLE,
    Key: {
      PK: ITEMS.USER.prefix + userId,
      SK: ITEMS.USER.prefix + userId,
    },
    UpdateExpression: "set accessToken = :a, refreshToken = :r, expiresAt = :e",
    ExpressionAttributeValues: {
      ":a": accessToken,
      ":r": refreshToken,
      ":e": expiresAt,
    },
  };

  try {
    await dbUpdate(params);
    return Ok.EMPTY;
  } catch (error) {
    return Err({ code: 500, message: "DB_ERROR" });
  }
};
