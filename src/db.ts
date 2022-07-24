import {
  DocumentClient,
  ItemCollectionKeyAttributeMap,
} from "aws-sdk/clients/dynamodb";
import { Err, Ok, Result } from "ts-results";
import { Errors } from "./types";

let dynamoDbClient: DocumentClient;
const getDBClient = () => {
  if (!dynamoDbClient) {
    dynamoDbClient = new DocumentClient();
  }

  return dynamoDbClient;
};

export const dbPut = async (
  params: DocumentClient.PutItemInput
): Promise<Result<void, Errors>> => {
  try {
    await getDBClient().put(params).promise();
    return Ok.EMPTY;
  } catch (error) {
    console.error(error);
    return Err({ code: 500, message: "DB_ERROR" });
  }
};
export const dbUpdate = async (
  params: DocumentClient.UpdateItemInput
): Promise<Result<void, Errors>> => {
  try {
    await getDBClient().update(params).promise();
    return Ok.EMPTY;
  } catch (error) {
    console.error(error);
    return Err({ code: 500, message: "DB_ERROR" });
  }
};
export const dbGet = async (
  params: DocumentClient.GetItemInput
): Promise<Result<DocumentClient.AttributeMap | undefined, Errors>> => {
  try {
    const { Item } = await getDBClient().get(params).promise();
    return Ok(Item);
  } catch (error) {
    console.error(error);
    return Err({ code: 500, message: "DB_ERROR" });
  }
};
export const dbDelete = async (
  params: DocumentClient.DeleteItemInput
): Promise<Result<void, Errors>> => {
  try {
    await getDBClient().delete(params).promise();
    return Ok.EMPTY;
  } catch (error) {
    console.error(error);
    return Err({ code: 500, message: "DB_ERROR" });
  }
};
