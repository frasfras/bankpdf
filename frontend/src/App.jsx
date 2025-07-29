import React, { useState } from "react";
import * as XLSX from "xlsx";

function App() {
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const normalizeData = (raw) => {
    if (!Array.isArray(raw) || raw.length === 0) return [];

    let jsonString = raw;
let cleanedJsonString = jsonString.replace(/BEGINNINGBALANCE\\n/g, '');
let parsedData = JSON.parse(cleanedJsonString);

    const normalized = [];
    const headers = raw[0];

    for (let i = 1; i < parsedData.length; i++) {
      const block = parsedData[i];
      const numRows = block[0]?.split("\n").length || 0;

      for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
        const row = headers.map((_, colIndex) => {
          const col = block[colIndex] || "";
          const lines = col.split("\n");
          return lines[rowIndex] || "";
        });
        normalized.push(row);
      }
    }

    return [headers, ...normalized.filter(row => {
  const description = row[1]?.toUpperCase() || "";
  const isEmpty = row.every(cell => cell.trim() === "");
  return !description.includes("BEGINNINGBALANCE") && !isEmpty;
})];

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
      const normalized = normalizeData(result);

      if (normalized.length > 1) {
        setHeaders(normalized[0]);
        setData(normalized.slice(1));
      } else {
        setHeaders([]);
        setData([]);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!headers.length || !data.length) return;

    const csvRows = [
      headers.join(","),
      ...data.map(row => row.map(cell => `"${cell || ""}"`).join(","))
    ];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "bank_statement.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadExcel = () => {
    if (!headers.length || !data.length) return;

    const rows = data.map(row =>
      headers.reduce((obj, key, index) => {
        obj[key] = row[index] || "";
        return obj;
      }, {})
    );

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");

    XLSX.writeFile(workbook, "bank_statement.xlsx");
  };

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h2>PDF Table Extractor</h2>
      <input type="file" accept="application/pdf" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={loading || !file}>
        {loading ? "Uploading..." : "Upload PDF"}
      </button>
      <button onClick={downloadCSV} disabled={!data.length}>
        Download CSV
      </button>
      <button onClick={downloadExcel} disabled={!data.length}>
        Download Excel
      </button>

      {data.length > 0 && (
        <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", marginTop: 20 }}>
          <thead>
            <tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => <td key={j}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {headers.length > 0 && (
        <p style={{ marginTop: 10, fontStyle: "italic", color: "#555" }}>
          Note: Credit amounts may appear one row above where they apply due to source formatting. Please verify during export.
        </p>
      )}

    </div>
  );
}

export default App;
