import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { Ok, Err, Result } from "ts-results";
import { ITEMS, ENV } from "../constants";
import { dbGet } from "../db";
import { Errors, User } from "../types";

export const fetchUserFromDB = async (
  userId: number
): Promise<Result<User, Errors>> => {
  console.log("Fetching user: ", userId);
  const params: DocumentClient.GetItemInput = {
    TableName: ENV.USERS_TABLE,
    Key: {
      PK: ITEMS.USER.prefix + userId,
      SK: ITEMS.USER.prefix + userId,
    },
  };

  const getResult = await dbGet(params);
  if (getResult.err) {
    return getResult;
  }

  const Item = getResult.val;
  if (Item) {
    console.debug(`User ${userId} found`);
    return Ok(Item as User);
  } else {
    console.info(`User ${userId} not found`);
    return Err({ code: 404, message: "NOT_FOUND" });
  }
};
