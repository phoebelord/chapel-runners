import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { Ok, Result } from "ts-results";
import { getCurrentChallenge } from "../../challenge/getChallenge";
import { ENV, ITEMS } from "../../constants";
import { dbDelete } from "../../db";
import { Activity, Challenge, Errors } from "../../types";
import { updateChallengeScore } from "../challengeScore/handleChallengeScore";
import { fetchActivityFromDB } from "./fetchActivityFromDB";

export const handleActivityDelete = async (
  userId: number,
  activityId: number
): Promise<Result<void, Errors>> => {
  const activityResult = await fetchActivityFromDB(userId, activityId);
  if (activityResult.err) {
    return activityResult;
  }

  const activity: Activity = activityResult.val;

  const challengeResult = await getCurrentChallenge();
  let challenge: Challenge | undefined;
  if (challengeResult.err) {
    const err = challengeResult.val;
    if (err.message !== "NOT_FOUND") {
      return challengeResult;
    }
    console.debug("Current challenge not found.");
  } else {
    console.debug("Current challenge found.");
    challenge = challengeResult.val;
  }

  if (challenge) {
    const points = activity.points;
    const updateChallengeResult = await updateChallengeScore(
      challenge,
      userId,
      -points
    );
    if (updateChallengeResult.err) {
      return updateChallengeResult;
    }
  }

  console.log("Challenge score updated");

  const params: DocumentClient.DeleteItemInput = {
    TableName: ENV.USERS_TABLE,
    Key: {
      PK: ITEMS.USER.prefix + userId,
      SK: ITEMS.ACTIVITY.prefix + activityId,
    },
  };

  const deleteResult = await dbDelete(params);
  if (deleteResult.err) {
    return deleteResult;
  }
  console.log(`Activity ${userId} : ${activityId} deleted`);
  return Ok.EMPTY;
};
