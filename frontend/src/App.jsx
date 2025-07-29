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
  const [originalData, setOriginalData] = useState([]);
  const [dirtyRows, setDirtyRows] = useState(new Set());
  const [loading, setLoading] = useState(false);

  const isValidCell = (value, header) => {
    if (header.toLowerCase().includes("amount") || header.toLowerCase() === "balance") {
      return /^\d{1,3}(,\d{3})*(\.\d{2})?$|^\d+(\.\d{2})?$/.test(value); // number with commas
    }
    if (header.toLowerCase() === "date") {
      return /^[A-Z][a-z]{2} \d{2}$/.test(value) || /^[A-Z][a-z]{2} \d{1,2}$/.test(value); // like Jun 09
    }
    return true;
  };

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

    // 🧼 Clean up repeated headers and BEGINNINGBALANCE rows
  const cleaned = normalized.filter(row => {
    const desc = row[1]?.toUpperCase() || "";
    const isFakeRow = desc.includes("BEGINNINGBALANCE");
    const isEmpty = row.every(cell => cell.trim() === "");
    const isHeaderRepeat = row.join("|").toUpperCase() === headers.join("|").toUpperCase();
    return !isFakeRow && !isEmpty && !isHeaderRepeat;
  });

  return [headers, ...cleaned];
    
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
        setOriginalData(JSON.parse(JSON.stringify(normalized.slice(1)))); // deep clone
        setDirtyRows(new Set());

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
//  const handleCellChange = (e, rowIndex, colIndex) => {
//  const newData = [...data];
//  newData[rowIndex][colIndex] = e.target.value;
//  setData(newData);
//  };
  const handleCellChange = (e, rowIndex, colIndex) => {
  const value = e.target.value;
  const newData = [...data];
  newData[rowIndex][colIndex] = value;

  const isDifferent = value !== originalData[rowIndex]?.[colIndex];
  const newDirtyRows = new Set(dirtyRows);
  if (isDifferent) newDirtyRows.add(rowIndex);
  else {
    // check if row is still dirty
    const isRowDirty = newData[rowIndex].some((val, i) => val !== originalData[rowIndex][i]);
    if (!isRowDirty) newDirtyRows.delete(rowIndex);
  }

  setData(newData);
  setDirtyRows(newDirtyRows);
};
  
const saveRow = (rowIndex) => {
  const newOriginal = [...originalData];
  newOriginal[rowIndex] = [...data[rowIndex]];
  setOriginalData(newOriginal);

  const newDirty = new Set(dirtyRows);
  newDirty.delete(rowIndex);
  setDirtyRows(newDirty);
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
                <TableRow key={rowIndex} sx={{ bgcolor: dirtyRows.has(rowIndex) ? "#fff7e6" : "inherit" }}>
                  {row.map((cell, colIndex) => {
                    const header = headers[colIndex];
                    const valid = isValidCell(cell, header);
            
                    return (
                      <TableCell key={colIndex}>
                        <input
                          value={cell}
                          onChange={(e) => handleCellChange(e, rowIndex, colIndex)}
                          style={{
                            width: "100%",
                            border: "none",
                            background: "transparent",
                            outline: "none",
                            font: "inherit",
                            color: valid ? "inherit" : "red",
                          }}
                        />
                      </TableCell>
                    );
                  })}
                  {dirtyRows.has(rowIndex) && (
                    <TableCell>
                      <Button variant="outlined" size="small" onClick={() => saveRow(rowIndex)}>
                        💾 Save
                      </Button>
                    </TableCell>
                  )}
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
