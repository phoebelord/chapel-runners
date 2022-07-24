import { ITEMS, ENV } from "../constants";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { Errors, StravaNewTokenResponse, User } from "../types";
import { Ok, Result } from "ts-results";
import { dbPut } from "../db";

export const createUser = async (
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

  const putResult = await dbPut(params);
  if (putResult.err) {
    return putResult;
  }

  console.log(`User ${id} created`);
  return Ok.EMPTY;
};
