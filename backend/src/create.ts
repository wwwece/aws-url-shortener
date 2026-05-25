import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { nanoid } from "nanoid";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.TABLE_NAME!;

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const body = JSON.parse(event.body ?? "{}");
    const url: string | undefined = body.url;

    if (!url || !/^https?:\/\//.test(url)) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid URL" }) };
    }

    const id = nanoid(7);
    await ddb.send(new PutCommand({
      TableName: TABLE,
      Item: { id, url, createdAt: new Date().toISOString() },
    }));

    return {
      statusCode: 201,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, shortUrl: `${event.requestContext.domainName}/${id}` }),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server error" }) };
  }
};