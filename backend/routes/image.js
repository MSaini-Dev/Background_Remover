const express = require("express");
const multer = require("multer");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const uuidv4 = require("uuid").v4; // Change this line
const cors = require("cors");

const router = express.Router();
router.use(cors());

// Ensure directories exist
const ensureDirectories = () => {
  const dirs = ["uploads", "outputs"];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};
ensureDirectories();

// Configure multer with disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
   const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueId}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "Only images allowed"));
    }
    cb(null, true);
  }
});

// Error handling middleware
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File too large. Maximum size is 5MB" });
    }
    return res.status(400).json({ error: err.message || "File upload error" });
  } else if (err) {
    return res.status(400).json({ error: err.message || "Unknown error" });
  }
  next();
};

// 1️⃣ Upload image
router.post("/upload", upload.single("image"), handleMulterError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const uploadId = path.parse(req.file.filename).name;
    
    res.json({ 
      success: true,
      uploadId,
      filename: req.file.filename,
      message: "File uploaded successfully" 
    });
    
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to upload file" });
  }
});

// 2️⃣ Process image
router.post("/process", async (req, res) => {
  try {
    const { uploadId } = req.body;

    if (!uploadId) {
      return res.status(400).json({ error: "uploadId required" });
    }

    // Find the file in uploads directory
    const files = fs.readdirSync("uploads");
    const inputFile = files.find(f => f.startsWith(uploadId));

    if (!inputFile) {
      return res.status(404).json({ error: "Image not found" });
    }

    const inputPath = path.join("uploads", inputFile);
    
    // Check if file exists
    if (!fs.existsSync(inputPath)) {
      return res.status(404).json({ error: "Image file not found" });
    }

    // Prepare form data for AI service
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('image', fs.createReadStream(inputPath));

    // Call AI service
    const response = await axios.post(
      process.env.AI_SERVICE_URL + "/remove-bg",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Content-Type': 'multipart/form-data'
        },
        responseType: "stream"
      }
    );

    // Create output directory if it doesn't exist
    if (!fs.existsSync("outputs")) {
      fs.mkdirSync("outputs", { recursive: true });
    }

    const outputPath = path.join("outputs", `${uploadId}_processed.png`);
    const writer = fs.createWriteStream(outputPath);
    
    response.data.pipe(writer);

    writer.on("finish", () => {
      // Send the processed file
      res.download(outputPath, `${uploadId}_processed.png`, (err) => {
        // Cleanup files after sending (or on error)
        try {
          if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
          if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        } catch (cleanupErr) {
          console.error("Cleanup error:", cleanupErr);
        }
        
        if (err) {
          console.error("Download error:", err);
          if (!res.headersSent) {
            res.status(500).json({ error: "Failed to send file" });
          }
        }
      });
    });

    writer.on("error", (err) => {
      console.error("Write stream error:", err);
      res.status(500).json({ error: "Failed to save processed image" });
    });

  } catch (err) {
    console.error("Processing error:", err);
    
    if (err.response) {
      // The AI service returned an error
      return res.status(err.response.status).json({ 
        error: err.response.data?.error || "AI service error" 
      });
    } else if (err.request) {
      // No response received
      return res.status(503).json({ error: "AI service unavailable" });
    } else {
      // Other errors
      return res.status(500).json({ error: "Processing failed: " + err.message });
    }
  }
});

// Optional: Add a cleanup route to remove old files
router.post("/cleanup", async (req, res) => {
  try {
    const { hours = 24 } = req.body; // Default: files older than 24 hours
    
    const now = Date.now();
    const cutoff = now - (hours * 60 * 60 * 1000);
    
    let deletedCount = 0;
    
    // Clean uploads directory
    const uploadFiles = fs.readdirSync("uploads");
    uploadFiles.forEach(file => {
      const filePath = path.join("uploads", file);
      const stats = fs.statSync(filePath);
      if (stats.mtimeMs < cutoff) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    });
    
    // Clean outputs directory
    const outputFiles = fs.readdirSync("outputs");
    outputFiles.forEach(file => {
      const filePath = path.join("outputs", file);
      const stats = fs.statSync(filePath);
      if (stats.mtimeMs < cutoff) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    });
    
    res.json({ 
      success: true, 
      message: `Deleted ${deletedCount} files older than ${hours} hours` 
    });
    
  } catch (error) {
    console.error("Cleanup error:", error);
    res.status(500).json({ error: "Cleanup failed" });
  }
});

module.exports = router;