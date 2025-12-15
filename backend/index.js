import express from "express";
import cors from "cors";
import imageRoutes from "./routes/image.js";
import rateLimit from "express-rate-limit";

const app = express();

app.use(cors());
app.use(express.json());

// basic rate limit (anti abuse)
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50
}));

app.use("/api/image", imageRoutes);

app.get("/", (_, res) => {
  res.send("Backend running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("Server started on port", PORT);
});
