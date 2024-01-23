import { createRequire } from "module";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  UpdateCommand,
  ScanCommand,
  PutCommand,
  GetCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

import { User } from "./models/User.js";

console.log("estuvimos aqui");

const require = createRequire(import.meta.url);

//const User = require("./models/User").default;

const { v4: uuidv4 } = require("uuid");

const client = new DynamoDBClient({});

const dynamo = DynamoDBDocumentClient.from(client);

const tableName = "trip-users";

export const handler = async (event, context) => {
  let body;
  let statusCode = 200;
  const headers = {
    "Content-Type": "application/json",
  };

  try {
    console.log("event: ", event);
    event = JSON.parse(event.body);
    console.log("event: ", event);
    console.log(event.routeKey);
    const requestJSON = JSON.parse(event.body);
    console.log("requestJSON: ", requestJSON);
    switch (event.routeKey) {
      case "DELETE /items/{id}":
        console.log("DELETE /items/{id}");
        let keyDelete = {
          TableName: tableName,
          Key: {
            id: event.pathParameters.id,
          },
        };

        await dynamo.send(new DeleteCommand(keyDelete));
        console.log("keyDelete", keyDelete);
        body = `Deleted item ${keyDelete.Key.id}`;
        break;
      case "GET /items/{id}":
        let keyDynamo = {
          TableName: tableName,
          Key: {
            id: event.pathParameters.id,
          },
        };
        console.log("keyDynamo", keyDynamo);

        body = await dynamo.send(new GetCommand(keyDynamo));
        body = body.Item;
        break;
      case "GET /items":
        body = await dynamo.send(new ScanCommand({ TableName: tableName }));
        body = body.Items;
        break;
      case "UPDATE /items/{id}":
        //let name = requestJSON.name;
        console.log("UPDATE1");
        let params = {
          TableName: tableName,
          Key: {
            id: event.pathParameters.id,
          },
          Projectionexpression: "#n",
          ExpressionAttributeNames: {
            "#n": "name",
            rh: "rh",
            mail: "mail",
            identification_number: "identification_number",
            phone: "phone",
            pwd: "pwd",
          },
          UpdateExpression: "set #n = :n ",
          ExpressionAttributeValues: {
            ":n": requestJSON.name,
            ":rh": requestJSON.rh,
            ":mail": requestJSON.mail,
            ":identification_number": requestJSON.identification_number,
            ":phone": requestJSON.phone,
            ":pwd": requestJSON.pwd,
          },
        };
      
        console.log("params", params);
        console.log("update 2");
        await dynamo.send(new UpdateCommand(params));
        body = `UPDATE /items ${params.Key.id}`;
        break;

      case "PUT /items":
        console.log("PUT /items");
        //let requestJSON = JSON.parse(event.body);
        console.log("requestJSON: ", requestJSON);
        let itemDynamo = {
          TableName: tableName,
          Item: {
            id: uuidv4(),
            identification_number: requestJSON.identification_number,
            name: requestJSON.name,
            mail: requestJSON.mail,
            phone: requestJSON.phone,
            pwd: requestJSON.pwd,
            rh: requestJSON.rh,
            //idViaje: requestJSON.idViaje,
          },
        };
        console.log("itemDynamo", itemDynamo);
        await dynamo.send(new PutCommand(itemDynamo));
        body = `Put item ${itemDynamo.Item.id}`;
        break;
      case "POST /login":
        login(requestJSON.mail, requestJSON.pwd);

        break;
      default:
        throw new Error(`Unsupported route: "${event.routeKey}"`);
    }

    async function login(mail, pwd) {
      let user = new User();
      user = await getUser(mail);
      if (pwd == user.pwd) {
        return console.log("login ok");
      } else {
        return "bad login";
      }
    }

    async function getUser(mail) {
      let keyDynamo = {
        TableName: tableName,
        Key: {
          mail: mail,
        },
      };
      console.log("keyDynamo", keyDynamo);

      return await dynamo.send(new GetCommand(keyDynamo));
    }
  } catch (err) {
    statusCode = 400;
    body = err.message;
  } finally {
    body = JSON.stringify(body);
    console.log(body);
  }

  return {
    statusCode,
    body,
    headers,
  };
};
