import { useState } from "react";
import axios from "axios";

function App() {
  const [file, setFile] = useState(null);
  const [uploadId, setUploadId] = useState(null);
  const [loading, setLoading] = useState(false);

  const uploadImage = async () => {
    if (!file) return alert("Select an image");

    const formData = new FormData();
    formData.append("image", file);

    setLoading(true);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/upload`,
        formData
      );
      setUploadId(res.data.uploadId);
      alert("Image uploaded. Click Remove Background.");
    } catch {
      alert("Upload failed");
    }
    setLoading(false);
  };

  const removeBackground = async () => {
    if (!uploadId) return;

    setLoading(true);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/process`,
        { uploadId },
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bg-removed.png";
      a.click();
      window.URL.revokeObjectURL(url);

    } catch {
      alert("Processing failed");
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>Background Remover</h1>

      <input
        type="file"
        accept="image/*"
        onChange={e => setFile(e.target.files[0])}
      />

      <br /><br />

      <button onClick={uploadImage} disabled={loading}>
        Upload Image
      </button>

      <br /><br />

      <button
        onClick={removeBackground}
        disabled={!uploadId || loading}
      >
        Remove Background
      </button>

      {loading && <p>Processing...</p>}
    </div>
  );
}

export default App;
