import { DocumentClient } from "aws-sdk/clients/dynamodb";
import dayjs = require("dayjs");
import { Err, Ok, Result } from "ts-results";
import { ENV, ITEMS } from "../constants";
import { dbGet } from "../db";
import { Challenge, Errors } from "../types";

export const fetchCurrentChallenge = async (): Promise<
  Result<Challenge | undefined, Errors>
> => {
  const id = ITEMS.CHALLENGE.prefix + dayjs().format("MMMM-YYYY").toUpperCase();
  return fetchChallenge(id);
};

export const fetchChallenge = async (
  id: string
): Promise<Result<Challenge | undefined, Errors>> => {
  console.log("Fetching Challenge: ", id);
  const params: DocumentClient.GetItemInput = {
    TableName: ENV.USERS_TABLE,
    Key: {
      PK: id,
      SK: id,
    },
  };

  const getResult = await dbGet(params);
  if (getResult.err) {
    return getResult;
  }

  const Item = getResult.val;
  if (Item) {
    console.debug(`Challenge ${id} found`);
    return Ok(Item as Challenge);
  } else {
    console.log(`Challenge ${id} not found`);
    return Ok(undefined);
  }
};
