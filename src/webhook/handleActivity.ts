import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { Err, Ok, Result } from "ts-results";
import { getCurrentChallenge } from "../challenge/getCurrentChallenge";
import { ITEMS, ENV } from "../constants";
import { dbPut } from "../db";
import {
  Activity,
  AspectType,
  Challenge,
  Errors,
  WebhookEvent,
} from "../types";
import { readStravaActivity } from "../user/activity/readStravaActivity";
import { getUserToken } from "../user/getUserToken";

export const handleActivity = async (
  event: WebhookEvent
): Promise<Result<void, Errors>> => {
  console.log("New activity event");
  const activityType = event.aspect_type;
  const activityId = event.object_id;
  const userId = event.owner_id;

  if (activityType === AspectType.DELETE) {
    console.log("Not creating");
    Ok.EMPTY;
  }

  const userTokenResult = await getUserToken(userId);
  if (userTokenResult.err) {
    return userTokenResult;
  }

  const userToken = userTokenResult.val;

  // fetch strava activity
  const stravaResult = await readStravaActivity(activityId, userToken);
  if (stravaResult.err) {
    return stravaResult;
  }

  const stravaActivity = stravaResult.val;
  console.log("Got strava activity ", stravaActivity);

  if (stravaActivity.type !== "Run") {
    console.log("Not a run");
    Ok.EMPTY;
  }

  const challengeResult = await getCurrentChallenge();
  let challenge: Challenge | undefined;
  if (challengeResult.err) {
    const err = challengeResult.val;

    // if the challenge is not found we'll still save
    if (err.message === "NOT_FOUND") {
      console.log("Current challenge not found ... continuing");
    } else {
      return challengeResult;
    }
  } else {
    challenge = challengeResult.val;
  }

  const tags = stravaActivity.description
    .split(" ")
    .filter((w: string) => w.startsWith("#"));

  let points = 0;
  if (challenge) {
    points = tags
      .map((tag) => {
        // TODO
        if (tag.includes("-")) {
          const splits = tag.split("-");
          const newTag = splits[0] + "-*";
          if (challenge?.tags[newTag]) {
            const extra = Number.parseInt(splits[1]);
            return isNaN(extra) ? 0 : extra;
          }

          return 0;
        } else {
          return challenge?.tags[tag] ?? 0;
        }
      })
      .reduce((a, b) => a + b, 0);
  }

  const activity: Activity = {
    PK: ITEMS.USER.prefix + userId,
    SK: ITEMS.ACTIVITY.prefix + activityId,
    Type: ITEMS.ACTIVITY.type,
    distance: stravaActivity.distance,
    elevationGain: stravaActivity.total_elevation_gain,
    startDate: stravaActivity.startDate,
    description: stravaActivity.description,
    movingTime: stravaActivity.moving_time,
    elapsedTime: stravaActivity.elapsed_time,
    tags,
    points,
  };
  const params: DocumentClient.PutItemInput = {
    TableName: ENV.USERS_TABLE,
    Item: activity,
  };

  try {
    await dbPut(params);
    console.log("Saved activity");
    return Ok.EMPTY;
  } catch (error) {
    console.error(error);
    return Err({ code: 500, message: "DB_ERROR" });
  }
};
