import { DocumentClient } from "aws-sdk/clients/dynamodb";

let dynamoDbClient: DocumentClient;
const getDBClient = () => {
  if (!dynamoDbClient) {
    dynamoDbClient = new DocumentClient();
  }

  return dynamoDbClient;
};

export const dbPut = async (params: DocumentClient.PutItemInput) => {
  return await getDBClient().put(params).promise();
};

export const dbUpdate = async (params: DocumentClient.UpdateItemInput) => {
  return await getDBClient().update(params).promise();
};
export const dbGet = async (params: DocumentClient.GetItemInput) => {
  return await getDBClient().get(params).promise();
};
