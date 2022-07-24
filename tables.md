# User

- PK: u#{userId}
- SK: u#{userId}

User details + strava tokens

## User Activity

- PK: u#{userId}
- SK: a#{activityId}

User's Strava activity + points

## User Challenge Details

- PK: u#{userId}
- SK: c#{challengeId}
- GSI1-PK: g#{groupId}
- GSI1-SK: u#{userId}

User's details for a challenge - which group they're in.

# Challenge

- PK: c#{challengeId}
- SK: c#{challengeId}

Challenge details and scoring system

## Challenge Group

- PK: c#{challengeId}
- SK: g#{groupId}

Group details.

## Challenge Score

- PK: c#{challengeId}
- SK: u#{userId}
- GSI1-PK: c#{challengeId}
- GSI1-SK: g#{groupId}

A users's score for a challenge.

# Tag

- PK: t#{tagName}
- SK: t#{tagName}

A tag's scoring system.
