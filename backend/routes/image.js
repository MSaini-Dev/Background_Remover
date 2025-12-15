import express from "express";
import multer from "multer";
import axios from "axios";
import fs from "fs";
import { v4 as uuid } from "uuid";

const router = express.Router();

const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only images allowed"));
    }
    cb(null, true);
  }
});

// 1️⃣ Upload image
router.post("/upload", upload.single("image"), (req, res) => {
  const uploadId = uuid();
  const ext = req.file.originalname.split(".").pop();
  const newPath = `uploads/${uploadId}.${ext}`;

  fs.renameSync(req.file.path, newPath);

  res.json({ uploadId });
});

// 2️⃣ Process image (after ad verification later)
router.post("/process", async (req, res) => {
  const { uploadId } = req.body;

  if (!uploadId) {
    return res.status(400).json({ error: "uploadId required" });
  }

  const inputPath = fs.readdirSync("uploads")
    .find(f => f.startsWith(uploadId));

  if (!inputPath) {
    return res.status(404).json({ error: "Image not found" });
  }

  try {
    const response = await axios.post(
      process.env.AI_SERVICE_URL + "/remove-bg",
      fs.createReadStream(`uploads/${inputPath}`),
      {
        headers: { "Content-Type": "multipart/form-data" },
        responseType: "stream"
      }
    );

    const outputPath = `outputs/${uploadId}.png`;
    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);

    writer.on("finish", () => {
      res.download(outputPath, () => {
        fs.unlinkSync(`uploads/${inputPath}`);
        fs.unlinkSync(outputPath);
      });
    });

  } catch (err) {
    res.status(500).json({ error: "Processing failed" });
  }
});

export default router;
