require("dotenv").config();
const path = require("path");
const express = require("express");
const OS = require("os");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "/")));
app.use(cors());

// Modern Mongoose connection using Promises (Removed deprecated callback and connection options)
mongoose
  .connect(process.env.MONGO_URI, {
    user: process.env.MONGO_USERNAME,
    pass: process.env.MONGO_PASSWORD,
    authSource: "admin", // Crucial if your Docker root user was created on the admin database
  })
  .then(() => console.log("MongoDB Connection Successful"))
  .catch((err) => console.error("MongoDB Connection Error: ", err));

const Schema = mongoose.Schema;

const dataSchema = new Schema({
  name: String,
  id: Number,
  description: String,
  image: String,
  velocity: String,
  distance: String,
});
const planetModel = mongoose.model("planets", dataSchema);

// Modernized route using async/await instead of callbacks
app.post("/planet", async function (req, res) {
  try {
    const planetData = await planetModel.findOne({ id: req.body.id });
    res.send(planetData);
  } catch (err) {
    console.error("Database query failed:", err);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

app.get("/", async (req, res) => {
  res.sendFile(path.join(__dirname, "/", "index.html"));
});

app.get("/os", function (req, res) {
  res.setHeader("Content-Type", "application/json");
  res.send({
    os: OS.hostname(),
    env: process.env.NODE_ENV,
  });
});

app.get("/live", function (req, res) {
  res.setHeader("Content-Type", "application/json");
  res.send({
    status: "live",
  });
});

app.get("/ready", function (req, res) {
  res.setHeader("Content-Type", "application/json");
  res.send({
    status: "ready",
  });
});

app.listen(3000, () => {
  console.log("Server successfully running on port - " + 3000);
});

module.exports = app;
