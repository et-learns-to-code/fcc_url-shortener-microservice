require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;

// additional modules to parse url
const dns = require("dns");
const { URL } = require("url");

// module and variables to connect to MongoDB
const { MongoClient } = require("mongodb");
const client = new MongoClient(process.env.MONGO_URI);
const databaseName = "urlshortener";
const collectionName = "urls";

// function to connect to MongoDB
async function connectToDatabase() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error(err);
  }
}

// function to close MongoDB connection
async function closeDatabaseConnection() {
  try {
    await client.close();
    console.log("Closed MongoDB connection");
  } catch (err) {
    console.error(err);
  }
}

// start MongoDB connection
connectToDatabase();

// access the urls collection
const urls = client.db(databaseName).collection(collectionName);

app.use(cors());

app.use("/public", express.static(`${process.cwd()}/public`));

// parses json data into req.body
app.use(express.json());

// parses url-encoded data into req.body
app.use(express.urlencoded({ extended: false }));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// your first API endpoint
app.get("/api/hello", function (req, res) {
  res.json({ greeting: "hello API" });
});

// assigns short_url to the url and saves it to MongoDB
app.post("/api/shorturl", function (req, res) {
  url = req.body.url;
  try {
    dns.lookup(new URL(url).hostname, async (err) => {
      if (err) {
        res.json({ error: "invalid url" });
      } else {
        urlCount = await urls.countDocuments();
        urlDoc = { original_url: url, short_url: urlCount };
        result = await urls.insertOne(urlDoc);
        console.log(result);
        res.json(urlDoc);
      }
    });
  } catch (err) {
    res.json({ error: "invalid url" });
  }
});

// redirects user to website based on short_url inputted
app.get("/api/shorturl/:short_url", async function (req, res) {
  redirectDoc = await urls.findOne({
    // req.params returns a string, so we have to convert it into a number first before we query the database
    short_url: Number(req.params.short_url),
  });
  res.redirect(redirectDoc.original_url);
});

// database connection is terminated before user exits the program
process.on("SIGINT", async function () {
  await closeDatabaseConnection();
  process.exit();
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
