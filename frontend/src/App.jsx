import React, { useState } from "react";

function App() {
  const [file, setFile] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const headers = ["Date", "Description", "Ref", "Details", "Debit Amount", "Credit Amount", "Balance"];

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
  const downloadCSV = () => {
  if (!data || data.length === 0) return;

  const headers = ["Date", "Description", "Ref", "Details", "Debit Amount", "Credit Amount", "Balance"];

  const csvRows = [
    headers.join(","), // header row
    ...data.map(row => row.map(cell => `"${cell || ""}"`).join(",")) // data rows with safe quotes
  ];

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "bank_statement.csv";
  a.click();
  URL.revokeObjectURL(url);
};

  return (
    <div style={{ padding: 20 }}>
      <h2>PDF Table Extractor</h2>
      <input type="file" accept="application/pdf" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={loading || !file}>
        {loading ? "Uploading..." : "Upload PDF"}
      </button>
      <button onClick={downloadCSV} disabled={!data}>
         📄Download CSV
      </button>

      <div style={{ marginTop: 20 }}>
        {data ? (
  <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", marginTop: 20 }}>
    <thead>
      <tr>
        {headers.map((header, index) => (
          <th key={index}>{header}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      {data.map((row, i) => (
        <tr key={i}>
          {row.map((cell, j) => (
            <td key={j}>{cell}</td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
) : (
  <p>No data yet.</p>
)}

      </div>
    </div>
  );
}

export default App;
