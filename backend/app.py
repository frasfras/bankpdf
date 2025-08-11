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
        # bank check
        month_crop = p0.within_bbox((0, 82, p0.width, 92))
        
        bank_chars = month_crop.extract_text()
        
        if bank_chars == 'EXPRESS TELLER CHECKING -PHP':
            explicit_vertical_lines = [34,62,198,220,370,439,508,579]
        for page in pages:
            # added 8/02
            if bank_chars == 'EXPRESS TELLER CHECKING -PHP':
                explicit_vertical_lines = [34,62,198,220,370,439,508,579]
                table = page.extract_table(table_settings={"vertical_strategy": "explicit",
                                                       "explicit_vertical_lines": explicit_vertical_lines,
                                               "horizontal_strategy": "text",
                                               "snap_tolerance": 4,
                                               "intersection_x_tolerance": 15,})[5:]
            else:
                table = page.extract_table(table_settings={"vertical_strategy": "lines", 
                                               "horizontal_strategy": "text", 
                                               "snap_tolerance": 4,
                                               "intersection_x_tolerance": 15,})[0:]
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
