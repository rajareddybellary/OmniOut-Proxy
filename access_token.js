// read .env
require("dotenv").config();
const moment = require("moment");
const fetch = require("node-fetch");
const data = require("./jwt.js")();

const url = process.env.AUDIENCE || "https://login.salesforce.com";

const getAccessToken = async () => {
  const sfResponse = await fetch(`${url}/services/oauth2/token`, {
    method: "post",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${data.token}`,
  })
    .then((resp) => resp.json())
    .then((data) => data);
  const result = {
    dateOfRequest: new Date(),
    accessToken: sfResponse.access_token,
    instanceUrl: sfResponse.instance_url,
  };
  return result;
};

const validateAccessToken = async (requestedDate) => {
  const currentDate = moment(new Date(), "YYYY-M-DD HH:mm:ss");
  const formattedRequestedDate = moment(requestedDate, "YYYY-M-DD HH:mm:ss");
  const differenceInMinutes = currentDate.diff(
    formattedRequestedDate,
    "minutes"
  );
  return differenceInMinutes;
};

exports.getAccessToken = getAccessToken;
exports.validateAccessToken = validateAccessToken;
