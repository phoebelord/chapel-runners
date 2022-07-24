import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { Ok, Result } from "ts-results";
import { ENV, ITEMS } from "../../constants";
import { dbGet } from "../../db";
import { Errors, UserChallengeDetails } from "../../types";

export const fetchUserChallengeDetails = async (
  userId: number,
  challengeId: string
): Promise<Result<UserChallengeDetails | undefined, Errors>> => {
  const params: DocumentClient.GetItemInput = {
    TableName: ENV.USERS_TABLE,
    Key: {
      PK: ITEMS.USER.prefix + userId,
      SK: challengeId,
    },
  };

  const getResult = await dbGet(params);
  if (getResult.err) {
    return getResult;
  }

  const Item = getResult.val;
  if (Item) {
    console.debug(`User Challenge details ${userId}:${challengeId} found`);
    return Ok(Item as UserChallengeDetails);
  } else {
    console.log(`User Challenge details ${userId}:${challengeId} not found`);
    return Ok(undefined);
  }
};
