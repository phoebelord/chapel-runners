import axios from "axios";
import { Err, Ok, Result } from "ts-results";
import { ENDPOINTS } from "../../constants";
import { Errors, StravaActivity } from "../../types";

export const readStravaActivity = async (
  activityId: number,
  token: string
): Promise<Result<StravaActivity, Errors>> => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
  try {
    const response = await axios.get(ENDPOINTS.ACTIVITY + activityId, config);
    return Ok(response.data as StravaActivity);
  } catch (error) {
    console.error(error);
    let code = 500;

    if (axios.isAxiosError(error) && error.response) {
      code = error.response.status;
    }
    return Err({ code, message: "COULD_NOT_READ_STRAVA_ACTIVITY" });
  }
};
