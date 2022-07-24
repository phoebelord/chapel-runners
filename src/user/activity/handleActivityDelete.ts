import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { Err, Ok, Result } from "ts-results";
import { fetchCurrentChallenge } from "../../challenge/fetchChallenge";
import { ENV, ITEMS } from "../../constants";
import { dbDelete } from "../../db";
import { Activity, Challenge, Errors, Points } from "../../types";
import { updateChallengeScore } from "../../challenge/challengeScore/handleChallengeScore";
import { fetchActivityFromDB } from "./fetchActivityFromDB";
import { fetchUserChallengeDetails } from "../challengeDetails/fetchUserChallengeDetails";

export const handleActivityDelete = async (
  userId: number,
  activityId: number
): Promise<Result<void, Errors>> => {
  const activityResult = await fetchActivityFromDB(userId, activityId);
  if (activityResult.err) {
    return activityResult;
  }

  const activity: Activity | undefined = activityResult.val;
  if (!activity) {
    return Err({ code: 404, message: "NOT_FOUND" });
  }

  const challengeResult = await fetchCurrentChallenge();
  let challenge: Challenge | undefined;
  if (challengeResult.err) {
    return challengeResult;
  }

  challenge = challengeResult.val;

  if (challenge) {
    const userChallengeDetailsResult = await fetchUserChallengeDetails(
      userId,
      challenge.PK
    );
    if (userChallengeDetailsResult.err) {
      return userChallengeDetailsResult;
    }
    const userChallengeDetails = userChallengeDetailsResult.val;

    const points = activity.points;
    const pointsIncrement: Points = {
      distance: -points.distance,
      elevation: -points.elevation,
      tags: -points.tags,
    };

    const updateChallengeResult = await updateChallengeScore(
      challenge,
      userChallengeDetails,
      userId,
      pointsIncrement
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
