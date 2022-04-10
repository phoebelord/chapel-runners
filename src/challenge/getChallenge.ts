import { DocumentClient } from "aws-sdk/clients/dynamodb";
import dayjs = require("dayjs");
import { Err, Ok, Result } from "ts-results";
import { ENV, ITEMS } from "../constants";
import { dbGet } from "../db";
import { Challenge, Errors } from "../types";

export const getCurrentChallenge = async (): Promise<
  Result<Challenge, Errors>
> => {
  const id = ITEMS.CHALLENGE.prefix + dayjs().format("MMMM-YYYY").toUpperCase();
  return await getChallenge(id);
};

export const getChallenge = async (
  id: string
): Promise<Result<Challenge, Errors>> => {
  console.log("Fetching Challenge: ", id);
  const params: DocumentClient.GetItemInput = {
    TableName: ENV.USERS_TABLE,
    Key: {
      PK: id,
      SK: id,
    },
  };
  try {
    const { Item } = await dbGet(params);
    if (Item) {
      console.log(Item);
      return Ok(Item as Challenge);
    } else {
      return Err({ code: 404, message: "NOT_FOUND" });
    }
  } catch (error) {
    console.error(error);
    return Err({ code: 500, message: "DB_ERROR" });
  }
};
