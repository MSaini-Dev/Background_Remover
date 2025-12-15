from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
from rembg import remove
from PIL import Image
import io
import os
import logging
import time

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.route("/remove-bg", methods=["POST"])
def remove_bg():
    start_time = time.time()
    
    try:
        logger.info("Received background removal request")
        
        if "image" not in request.files:
            logger.error("No image in request")
            return jsonify({"error": "No image provided"}), 400
        
        file = request.files["image"]
        if file.filename == "":
            logger.error("Empty filename")
            return jsonify({"error": "No file selected"}), 400
        
        logger.info(f"Processing image: {file.filename}")
        
        # Read and validate image
        input_image = Image.open(file.stream)
        logger.info(f"Image size: {input_image.size}, mode: {input_image.mode}")
        
        # Remove background
        logger.info("Starting background removal...")
        output_image = remove(input_image)
        
        elapsed = time.time() - start_time
        logger.info(f"Background removal complete in {elapsed:.2f}s")
        
        # Convert to bytes
        output_bytes = io.BytesIO()
        output_image.save(output_bytes, format="PNG")
        output_bytes.seek(0)
        
        logger.info("Sending processed image")
        return send_file(
            output_bytes, 
            mimetype="image/png",
            as_attachment=False,
            download_name=f"processed_{file.filename}"
        )
        
    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(f"Error after {elapsed:.2f}s: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok", 
        "service": "background-remover",
        "version": "1.0"
    })

@app.route("/", methods=["GET"])
def index():
    return jsonify({
        "message": "Background Removal Service", 
        "status": "running",
        "endpoints": {
            "/remove-bg": "POST - Remove background from image",
            "/health": "GET - Health check"
        }
    })

if __name__ == "__main__":
    # For local development only
    app.run(host="0.0.0.0", port=10000, debug=False)
