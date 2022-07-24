import { Result } from "ts-results";
import { AspectType, Errors, WebhookEvent } from "../../types";
import { handleActivityCreateOrUpdate } from "./handleActivityCreateOrUpdate";
import { handleActivityDelete } from "./handleActivityDelete";

export const handleActivity = async (
  event: WebhookEvent
): Promise<Result<void, Errors>> => {
  const activityType = event.aspect_type;
  const activityId = event.object_id;
  const userId = event.owner_id;

  if (activityType === AspectType.DELETE) {
    console.log(`Handling deletion of activity ${userId} : ${activityId}`);
    return handleActivityDelete(userId, activityId);
  } else {
    console.log(
      `Handling creation/update of activity ${userId} : ${activityId}`
    );
    return handleActivityCreateOrUpdate(userId, activityId);
  }
};
