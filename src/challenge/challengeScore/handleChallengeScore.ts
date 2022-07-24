import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { Ok, Result } from "ts-results";
import { ENV, ITEMS } from "../../constants";
import { dbUpdate } from "../../db";
import {
  Challenge,
  Errors,
  Points,
  StravaActivity,
  UserChallengeDetails,
} from "../../types";

export const calculateChallengePoints = (
  stravaActivity: StravaActivity,
  tags: string[],
  challenge: Challenge
): Points => {
  const points: Points = calculateTrackerPoints(challenge, stravaActivity);
  points.tags = calculateTagPoints(challenge, tags);

  return points;
};

export const updateChallengeScore = async (
  challenge: Challenge,
  userChallengeDetails: UserChallengeDetails | undefined,
  userId: number,
  pointsIncrement: Points
): Promise<Result<void, Errors>> => {
  const initExpression = "set itemType = :t, points = :points";
  const initParams: DocumentClient.UpdateItemInput = {
    TableName: ENV.USERS_TABLE,
    Key: {
      PK: challenge.PK,
      SK: ITEMS.USER.prefix + userId,
    },
    UpdateExpression: initExpression,
    ExpressionAttributeValues: {
      ":t": ITEMS.CHALLENGE_SCORE.type,
      ":points": {
        distance: 0,
        elevation: 0,
        tags: 0,
      },
    },
    ConditionExpression: "attribute_not_exists(points)",
  };

  const initResult = await dbUpdate(initParams);
  if (initResult.err && initResult.val.message !== "CHECK_FAILED") {
    return initResult;
  }

  let updateExpression =
    "SET itemType = :t ADD #points.#distance :distanceInc, #points.#elevation :elevationInc, #points.#tags :tagsInc";
  const expressionAttributeValues: { [key: string]: any } = {
    ":t": ITEMS.CHALLENGE_SCORE.type,
    ":distanceInc": pointsIncrement.distance,
    ":elevationInc": pointsIncrement.elevation,
    ":tagsInc": pointsIncrement.tags,
  };
  let expressionAttributeNames: { [key: string]: string } = {
    "#points": "points",
    "#distance": "distance",
    "#elevation": "elevation",
    "#tags": "tags",
  };

  if (userChallengeDetails?.["GSI1-PK"] && userChallengeDetails["GSI1-SK"]) {
    updateExpression =
      "SET itemType = :t, #GSI1PK = :gsi1pk, #GSI1SK = :gsi1sk ADD #points.#distance :distanceInc, #points.#elevation :elevationInc, #points.#tags :tagsInc";
    expressionAttributeNames["#GSI1PK"] = "GSI1-PK";
    expressionAttributeNames["#GSI1SK"] = "GSI1-SK";

    expressionAttributeValues[":gsi1pk"] = userChallengeDetails["GSI1-PK"];
    expressionAttributeValues[":gsi1sk"] = userChallengeDetails["GSI1-SK"];
  }
  const params: DocumentClient.UpdateItemInput = {
    TableName: ENV.USERS_TABLE,
    Key: {
      PK: challenge.PK,
      SK: ITEMS.USER.prefix + userId,
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
  };

  const updateResult = await dbUpdate(params);
  if (updateResult.err) {
    return updateResult;
  }

  console.log(`Challenge score ${userId} : ${challenge.PK} updated`);
  return Ok.EMPTY;
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
): Points => {
  let points: Points = {
    distance: 0,
    elevation: 0,
    tags: 0,
  };

  const distancePointsMapping = challenge.trackers.distance;
  if (distancePointsMapping) {
    console.log(distancePointsMapping);
    const distancePoints = calculatePointsFromMapping(
      distancePointsMapping,
      activity.distance / 1000
    );
    console.log("Distance points: ", distancePoints);
    points.distance = distancePoints;
  }

  const elevationPointsMapping = challenge.trackers.elevation;
  if (elevationPointsMapping) {
    const elevationPoints = calculatePointsFromMapping(
      elevationPointsMapping,
      activity.total_elevation_gain / 1000
    );
    console.log("Elevation points: ", elevationPoints);
    points.elevation = elevationPoints;
  }
  return points;
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
