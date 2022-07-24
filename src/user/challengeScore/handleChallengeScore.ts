import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { Ok, Result } from "ts-results";
import { ENV, ITEMS } from "../../constants";
import { dbUpdate } from "../../db";
import { Challenge, Errors, StravaActivity } from "../../types";

export const calculateChallengePoints = (
  stravaActivity: StravaActivity,
  tags: string[],
  challenge: Challenge
): number => {
  let points = calculateTagPoints(challenge, tags);
  points += calculateTrackerPoints(challenge, stravaActivity);

  return points;
};

export const updateChallengeScore = async (
  challenge: Challenge,
  userId: number,
  pointsIncrement: number
): Promise<Result<void, Errors>> => {
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
      ":inc": pointsIncrement,
    },
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
