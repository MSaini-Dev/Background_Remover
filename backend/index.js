const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const image = require("./routes/image");
require("dotenv").config(); // Add this line

const app = express();

app.use(cors());
app.use(express.json());

// basic rate limit (anti abuse)
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50
}));

app.use("/api/image", image);

app.get("/", (_, res) => {
  res.send("Backend running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("Server started on port", PORT);
  console.log("AI Service URL:", process.env.AI_SERVICE_URL);
});