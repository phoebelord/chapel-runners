import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { Ok, Err, Result } from "ts-results";
import { ITEMS, ENV } from "../../constants";
import { dbGet } from "../../db";
import { Activity, Errors } from "../../types";

export const fetchActivityFromDB = async (
  userId: number,
  activityId: number
): Promise<Result<Activity, Errors>> => {
  console.log(`Fetching user activity: ${userId} : ${activityId}`);
  const params: DocumentClient.GetItemInput = {
    TableName: ENV.USERS_TABLE,
    Key: {
      PK: ITEMS.USER.prefix + userId,
      SK: ITEMS.ACTIVITY.prefix + activityId,
    },
  };

  const getResult = await dbGet(params);
  if (getResult.err) {
    return getResult;
  }

  const Item = getResult.val;
  if (Item) {
    console.debug(`Activity ${userId} : ${activityId} found`);
    return Ok(Item as Activity);
  } else {
    console.info(`Activity not found: ${userId} : ${activityId}`);
    return Err({ code: 404, message: "NOT_FOUND" });
  }
};
