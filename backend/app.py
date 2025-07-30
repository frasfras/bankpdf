from flask import Flask, request, jsonify
from flask_cors import CORS
import pdfplumber
import io

app = Flask(__name__)
CORS(app)

@app.route("/extract", methods=["POST"])
def extract_table():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files["file"]
    pdf_bytes = file.read()
    line_items = []

    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables()
            for table in tables:
                for row in table:
                  #  if row and any(cell and cell.strip() for cell in row):
                        # Clean the row: replace whitespace-only cells with empty string
                        cleaned_row = []
                        for cell in row:
                            if cell and cell.strip():
                                cleaned_row.append(cell)
                            else:
                                cleaned_row.append(' \n')
                        line_items.append(cleaned_row)
    

    return jsonify(line_items)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
