export const ITEMS: { [key: string]: { type: string; prefix: string } } = {
  USER: {
    type: "User",
    prefix: "u#",
  },
  ACTIVITY: {
    type: "Activity",
    prefix: "a#",
  },
  CHALLENGE: {
    type: "Challenge",
    prefix: "c#",
  },
  CHALLENGE_SCORE: {
    type: "ChallengeScore",
    prefix: "cs#",
  },
};

export const ENDPOINTS: { [key: string]: string } = {
  TOKEN: "https://www.strava.com/oauth/token",
  ACTIVITY: "https://www.strava.com/api/v3/activities/",
};

export const ENV = {
  USERS_TABLE: process.env.USERS_TABLE!,
  CLIENT_SECRET: process.env.CLIENT_SECRET!,
  CLIENT_ID: process.env.CLIENT_ID!,
  VERIFY_TOKEN: process.env.VERIFY_TOKEN!,
};
