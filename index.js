const data = require("./access_token.js");

// Simple Express server setup to serve the build output
const compression = require("compression");
const express = require("express");
const path = require("path");
const cors = require("cors");
const cluster = require("cluster");
var jsforceAjaxProxy = require("./proxy");

const app = express();
app.use(compression());
app.use(cors());

const HOST = process.env.HOST || "localhost";
const PORT = process.env.PORT || 3031;
const DIST_DIR = "./client";

async function token() {
  tokenData = await data.getAccessToken();
  console.log(tokenData);
  app.all("/proxy/?*", jsforceAjaxProxy({ enableCORS: true, tokenData }));
}
token();

let workers = [];
let tokenData;
/**
 * Setup number of worker processes to share port which will be defined while setting up server
 */
const setupWorkerProcesses = () => {
  // to read number of cores on system
  let numCores = require("os").cpus().length;
  console.log("Master cluster setting up " + numCores + " workers");

  // iterate on number of cores need to be utilized by an application
  // current example will utilize all of them
  for (let i = 0; i < numCores; i++) {
    // creating workers and pushing reference in an array
    // these references can be used to receive messages from workers
    workers.push(cluster.fork());

    // to receive messages from worker process
    workers[i].on("message", function (message) {
      console.log(message);
    });
  }

  // process is clustered on a core and process id is assigned
  cluster.on("online", function (worker) {
    console.log("Worker " + worker.process.pid + " is listening");
  });

  // if any of the worker process dies then start a new one by simply forking another one
  cluster.on("exit", function (worker, code, signal) {
    console.log(
      "Worker " +
        worker.process.pid +
        " died with code: " +
        code +
        ", and signal: " +
        signal
    );
    console.log("Starting a new worker");
    workers.push(cluster.fork());
    // to receive messages from worker process
    workers[workers.length - 1].on("message", function (message) {
      console.log(message);
    });
  });
};

/**
 * Setup an express server and define port to listen all incoming requests for this application
 */
const setUpExpress = () => {
  app.use(express.static(DIST_DIR));

  app.get("/*", async (req, res, next) => {
    if (req.params["0"] === "api/v1/token") {
      const result = await data.validateAccessToken(tokenData.dateOfRequest);
      if (result > 100) {
        console.log(`renewing accessToken`);
        token();
      }
      res.send(`${tokenData.accessToken}`);
    } else {
      res.sendFile(path.resolve(DIST_DIR, "index.html"));
    }
  });
  // app.use('*', (req, res) => {
  //     res.sendFile(path.resolve(DIST_DIR, 'index.html'));
  // });

  app.listen(PORT, () =>
    console.log(`✅  Server started: http://${HOST}:${PORT}`)
  );
};

/**
 * Setup server either with clustering or without it
 * @param isClusterRequired
 * @constructor
 */
const setupServer = (isClusterRequired) => {
  // if it is a master process then call setting up worker process
  if (isClusterRequired && cluster.isMaster) {
    setupWorkerProcesses();
  } else {
    // to setup server configurations and share port address for incoming requests
    setUpExpress();
  }
};

setupServer(false);
