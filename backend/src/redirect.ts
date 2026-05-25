import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.TABLE_NAME!;

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const id = event.pathParameters?.id;
  if (!id) return { statusCode: 400, body: "Missing id" };

  const result = await ddb.send(new GetCommand({
    TableName: TABLE,
    Key: { id },
  }));

  if (!result.Item) return { statusCode: 404, body: "Not found" };

  return {
    statusCode: 301,
    headers: { Location: result.Item.url as string },
  };
};