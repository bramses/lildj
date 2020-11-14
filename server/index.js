const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();

require("dotenv").config();

const OpenAI = require("openai-api");
const OPEN_AI_API_KEY = process.env.OPEN_AI_API_KEY;
const openai = new OpenAI(OPEN_AI_API_KEY);

const { workflow } = require('./spotify')

const PORT = 5000;

app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(
  bodyParser.urlencoded({
    // to support URL-encoded bodies
    extended: true,
  })
);
app.use(cors());

// send auth code to backend
app.post("/spotify-workflow", async (req, res) => {
  try {
    const playlistData = await workflow(req.body.gptString, req.body.seedTracks, req.body.message)
    console.log(playlistData)
    res.json(playlistData)
  } catch (error) {
    res.status(500).send({
      message: error,
    });
  }
});

app.post("/get-message", async (req, res) => {
  try {
    console.log(`Recieved message: ${req.body.message}`);
    const gptResponse = await openai.complete({
      engine: "davinci",
      prompt: req.body.message,
      maxTokens: 100,
      temperature: 0.1,
      topP: 0.1,
      presence_penalty: 1.0,
      frequency_penalty: 1.0,
      best_of: 1,
      n: 1,
      stream: false,
      stop: ["Mood:", "4."],
    });

    res.json(gptResponse.data);
  } catch (error) {
    res.status(500).send({
      message: error,
    });
  }
});

app.listen(PORT, function () {
  console.log(`server running on port ${PORT}`);
});
