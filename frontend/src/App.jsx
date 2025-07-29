import React, { useState } from "react";

function App() {
  const [file, setFile] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);

    try {
      const response = await fetch(
        process.env.REACT_APP_API_URL + "/extract",
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Upload failed:", error);
      setData({ error: "Failed to upload or parse PDF" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>PDF Table Extractor</h2>
      <input type="file" accept="application/pdf" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={loading || !file}>
        {loading ? "Uploading..." : "Upload PDF"}
      </button>
      <div style={{ marginTop: 20 }}>
        <pre style={{ whiteSpace: "pre-wrap" }}>
          {data ? JSON.stringify(data, null, 2) : "No data yet."}
        </pre>
      </div>
    </div>
  );
}

export default App;
