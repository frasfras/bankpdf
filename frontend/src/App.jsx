import React, { useState } from "react";
import * as XLSX from "xlsx";
import {
  Container,
  Typography,
  Button,
  Box,
  CircularProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Alert,
} from "@mui/material";
import UploadFileIcon from '@mui/icons-material/UploadFile';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

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

    const normalized = [];
    const headers = raw[0];

    for (let i = 1; i < raw.length; i++) {
      const block = raw[i];
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

    return [
      headers,
      ...normalized];
    
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
  const handleCellChange = (e, rowIndex, colIndex) => {
  const newData = [...data];
  newData[rowIndex][colIndex] = e.target.value;
  setData(newData);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        📄 PDF Table Extractor
      </Typography>

      <Box display="flex" alignItems="center" gap={2} my={2}>
        <input
          accept="application/pdf"
          style={{ display: "none" }}
          id="upload-pdf"
          type="file"
          onChange={handleFileChange}
        />
        <label htmlFor="upload-pdf">
          <Button variant="contained" component="span" startIcon={<UploadFileIcon />}>
            Select PDF
          </Button>
        </label>
        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={!file || loading}
          color="primary"
        >
          {loading ? <CircularProgress size={24} /> : "Upload & Extract"}
        </Button>
        <Button
          variant="outlined"
          onClick={downloadCSV}
          disabled={!data.length}
          startIcon={<FileDownloadIcon />}
        >
          CSV
        </Button>
        <Button
          variant="outlined"
          onClick={downloadExcel}
          disabled={!data.length}
          startIcon={<FileDownloadIcon />}
        >
          Excel
        </Button>
      </Box>

      {headers.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Note: Credit amounts may appear one row above where they apply due to source formatting.
        </Alert>
      )}

      {data.length > 0 && (
        <Paper>
          <Table size="small">
            <TableHead>
              <TableRow>
                {headers.map((h, i) => (
                  <TableCell key={i}><strong>{h}</strong></TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
                {data.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {row.map((cell, colIndex) => (
                      <TableCell key={colIndex}>
                        <input
                          value={cell}
                          onChange={(e) => handleCellChange(e, rowIndex, colIndex)}
                          style={{
                            width: "100%",
                            border: "none",
                            background: "transparent",
                            outline: "none",
                            font: "inherit"
                          }}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>

          </Table>
        </Paper>
      )}
    </Container>
  );
}

export default App;
