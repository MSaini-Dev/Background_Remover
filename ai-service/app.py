# 
from flask import Flask, request, send_file
from flask_cors import CORS
from rembg import remove
from PIL import Image
import io
import os

app = Flask(__name__)
CORS(app)

@app.route("/remove-bg", methods=["POST"])
def remove_bg():
    try:
        if "image" not in request.files:
            return {"error": "No image provided"}, 400
        
        file = request.files["image"]
        if file.filename == "":
            return {"error": "No file selected"}, 400
        
        # Read image file
        input_image = Image.open(file.stream)
        
        # Remove background
        output_image = remove(input_image)
        
        # Save to bytes
        output_bytes = io.BytesIO()
        output_image.save(output_bytes, format="PNG")
        output_bytes.seek(0)
        
        return send_file(output_bytes, mimetype="image/png")
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {"error": str(e)}, 500

# Add health check endpoint for Render
@app.route("/health", methods=["GET"])
def health_check():
    return {"status": "healthy", "service": "background-removal"}

# This part is important for Render
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=False)