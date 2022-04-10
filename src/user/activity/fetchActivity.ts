import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { Ok, Err, Result } from "ts-results";
import { ITEMS, ENV } from "../../constants";
import { dbGet } from "../../db";
import { Activity, Errors } from "../../types";

export const fetchActivity = async (
  userId: number,
  activityId: number
): Promise<Result<Activity, Errors>> => {
  console.log("Fetching user: ", userId);
  const params: DocumentClient.GetItemInput = {
    TableName: ENV.USERS_TABLE,
    Key: {
      PK: ITEMS.USER.prefix + userId,
      SK: ITEMS.ACTIVITY.prefix + activityId,
    },
  };

  try {
    const { Item } = await dbGet(params);
    console.log(Item);
    if (Item) {
      return Ok(Item as Activity);
    } else {
      console.info("User not found: ", userId);
      return Err({ code: 404, message: "NOT_FOUND" });
    }
  } catch (error) {
    console.error(error);
    return Err({ code: 500, message: "DB_ERROR" });
  }
};
