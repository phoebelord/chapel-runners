import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { Err, Ok, Result } from "ts-results";
import { getCurrentChallenge } from "../challenge/getChallenge";
import { ITEMS, ENV } from "../constants";
import { dbPut, dbUpdate } from "../db";
import {
  Activity,
  AspectType,
  Challenge,
  Errors,
  StravaActivity,
  WebhookEvent,
} from "../types";
import { fetchActivity } from "../user/activity/fetchActivity";
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
    return Ok.EMPTY;
  }

  const stravaActivityResult = await getActivityDetails(userId, activityId);
  if (stravaActivityResult.err) {
    return stravaActivityResult;
  }
  const stravaActivity = stravaActivityResult.val;

  if (stravaActivity.type !== "Run") {
    console.log("Not a run");
    return Ok.EMPTY;
  }

  const activityResult = await fetchActivity(userId, activityId);
  let existing: Activity | undefined;
  if (activityResult.err) {
    const error = activityResult.val;
    if (error.message !== "NOT_FOUND") {
      return activityResult;
    }
  } else {
    existing = activityResult.val;
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

  const description = stravaActivity.description ?? "";
  const tags = description.split(" ").filter((w: string) => w.startsWith("#"));

  let points = 0;
  if (challenge) {
    points += calculateTagPoints(challenge, tags);
    points += calculateTrackerPoints(challenge, stravaActivity);

    const inc = existing ? points - existing.points : points;

    let params: DocumentClient.UpdateItemInput = {
      TableName: ENV.USERS_TABLE,
      Key: {
        PK: ITEMS.USER.prefix + userId,
        SK: challenge.PK,
      },
      UpdateExpression:
        "set itemType= :t, points = if_not_exists(points, :init) + :inc",
      ExpressionAttributeValues: {
        ":t": ITEMS.CHALLENGE_SCORE.type,
        ":init": 0,
        ":inc": inc,
      },
    };

    try {
      await dbUpdate(params);
    } catch (error) {
      console.error(error);
      return Err({ code: 400, message: "DB_ERROR" });
    }
  }

  const activity: Activity = {
    PK: ITEMS.USER.prefix + userId,
    SK: ITEMS.ACTIVITY.prefix + activityId,
    Type: ITEMS.ACTIVITY.type,
    distance: stravaActivity.distance,
    elevationGain: stravaActivity.total_elevation_gain,
    startDate: stravaActivity.start_date,
    description,
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

const getActivityDetails = async (
  userId: number,
  activityId: number
): Promise<Result<StravaActivity, Errors>> => {
  const userTokenResult = await getUserToken(userId);
  if (userTokenResult.err) {
    return userTokenResult;
  }
  const userToken = userTokenResult.val;

  const stravaResult = await readStravaActivity(activityId, userToken);
  if (stravaResult.err) {
    return stravaResult;
  }
  const stravaActivity = stravaResult.val;
  console.log("Got strava activity ", stravaActivity);

  return Ok(stravaActivity);
};

const calculateTagPoints = (challenge: Challenge, tags: string[]): number => {
  return tags
    .map((tag) => {
      if (tag.includes("-")) {
        const splits = tag.split("-");
        const newTag = splits[0] + "-*";
        if (challenge.tags[newTag] !== undefined) {
          const extra = Number.parseInt(splits[1]);
          return isNaN(extra) ? 0 : extra;
        }
        return 0;
      } else {
        return challenge.tags[tag] ?? 0;
      }
    })
    .reduce((a, b) => a + b, 0);
};

const calculateTrackerPoints = (
  challenge: Challenge,
  activity: StravaActivity
): number => {
  let total = 0;

  const distancePointsMapping = challenge.trackers.distance;
  if (distancePointsMapping) {
    console.log(distancePointsMapping);
    const points = calculatePointsFromMapping(
      distancePointsMapping,
      activity.distance / 1000
    );
    console.log("Distance points: ", points);
    total += points;
  }

  const elevationPointsMapping = challenge.trackers.elevation;
  if (elevationPointsMapping) {
    const points = calculatePointsFromMapping(
      elevationPointsMapping,
      activity.total_elevation_gain / 1000
    );
    console.log("Elevation points: ", points);
    total += points;
  }
  return total;
};

const calculatePointsFromMapping = (
  pointsMap: { [key: number]: number },
  val: number
): number => {
  let points = 0;
  for (const [key, value] of Object.entries(pointsMap)) {
    if (val < Number.parseFloat(key)) {
      break;
    }
    points = value;
  }
  return points;
};
