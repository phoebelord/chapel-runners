import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { Err, Ok, Result } from "ts-results";
import { getCurrentChallenge } from "../../challenge/getChallenge";
import { ITEMS, ENV } from "../../constants";
import { dbPut } from "../../db";
import { Activity, Challenge, Errors, StravaActivity } from "../../types";
import {
  calculateChallengePoints,
  updateChallengeScore,
} from "../challengeScore/handleChallengeScore";
import { fetchActivityFromDB } from "./fetchActivityFromDB";
import { fetchActivityFromStrava } from "./fetchActivityFromStrava";

export const handleActivityCreateOrUpdate = async (
  userId: number,
  activityId: number
): Promise<Result<void, Errors>> => {
  // Get full activity details from Strava
  const stravaActivityResult = await fetchActivityFromStrava(
    userId,
    activityId
  );
  if (stravaActivityResult.err) {
    return stravaActivityResult;
  }
  const stravaActivity = stravaActivityResult.val;

  if (stravaActivity.type !== "Run") {
    console.log("Activity not a run. Returning.");
    return Ok.EMPTY;
  }

  // Get the matching activity from DB - if exists
  // If it does, then this is an update
  const activityResult = await fetchActivityFromDB(userId, activityId);
  let existingActivity: Activity | undefined;
  if (activityResult.err) {
    const err = activityResult.val;
    if (err.message !== "NOT_FOUND") {
      return activityResult;
    }
    console.debug(`Activity ${userId} : ${activityId} is new.`);
  } else {
    console.debug(`Activity ${userId} : ${activityId} is exists. Updating.`);
    existingActivity = activityResult.val;
  }

  const tags = stravaActivity.description
    .split(" ")
    .filter((w: string) => w.startsWith("#"));

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

  let points = 0;
  if (challenge) {
    points = calculateChallengePoints(stravaActivity, tags, challenge);
    const pointsIncrement = existingActivity
      ? points - existingActivity.points
      : points;

    const updateChallengeResult = await updateChallengeScore(
      challenge,
      userId,
      pointsIncrement
    );
    if (updateChallengeResult.err) {
      return updateChallengeResult;
    }
  }

  return saveNewActivity(userId, activityId, stravaActivity, tags, points);
};

const saveNewActivity = async (
  userId: number,
  activityId: number,
  stravaActivity: StravaActivity,
  tags: string[],
  points: number
): Promise<Result<void, Errors>> => {
  const newActivity: Activity = {
    PK: ITEMS.USER.prefix + userId,
    SK: ITEMS.ACTIVITY.prefix + activityId,
    Type: ITEMS.ACTIVITY.type,
    distance: stravaActivity.distance,
    elevationGain: stravaActivity.total_elevation_gain,
    startDate: stravaActivity.start_date,
    description: stravaActivity.description,
    movingTime: stravaActivity.moving_time,
    elapsedTime: stravaActivity.elapsed_time,
    tags,
    points,
  };
  const activityParams: DocumentClient.PutItemInput = {
    TableName: ENV.USERS_TABLE,
    Item: newActivity,
  };

  const putResult = await dbPut(activityParams);
  if (putResult.err) {
    return putResult;
  }

  console.log(`Activity ${userId} : ${activityId} saved`);
  return Ok.EMPTY;
};
