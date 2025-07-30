from flask import Flask, request, jsonify
from flask_cors import CORS
import io
import pdfplumber
import os

app = Flask(__name__)
CORS(app)
 
def extract_table_from_pdf(pdf_path):
    """Extract table data from PDF bytes"""
    with pdfplumber.open(pdf_path) as pdf:
        pages = pdf.pages
        p0 = pdf.pages[0]
        im = p0.to_image()
        im
        data = []
        for page in pages:
            table = page.extract_table(table_settings={"vertical_strategy": "lines", 
                                               "horizontal_strategy": "text", 
                                               "snap_tolerance": 4,})[0:]
            if table:
                data.extend(table)
    return data

@app.route("/extract", methods=["POST"])
def extract():
    file = request.files["file"]
    temp_path = os.path.join("/tmp", file.filename)
    file.save(temp_path)

    # Extract the table
    table_data = extract_table_from_pdf(temp_path)

    return jsonify({"table": table_data})
