"""
Generate realistic-looking W-2 demo PDFs for local development.

Usage:
    cd backend
    python generate_demo_pdfs.py
"""

import os
from fpdf import FPDF

OUTPUT_DIR = "./uploads/demo"

DOCS = [
    {
        "filename": "w2_john_doe_2024.pdf",
        "employee_name": "John Doe",
        "employee_ssn": "***-**-1234",
        "employee_address": "456 Oak Avenue, Brooklyn, NY 11201",
        "employer_name": "ACME REAL ESTATE LLC",
        "employer_ein": "12-3456789",
        "employer_address": "100 Business Plaza, New York, NY 10001",
        "tax_year": "2024",
        "box1": "75,250.00",
        "box2": "12,500.00",
        "box3": "75,250.00",
        "box4": "4,665.50",
        "box5": "75,250.00",
        "box6": "1,091.13",
        "box12a": "D  3,500.00",
        "box13_retirement": True,
        "box15": "NY",
        "box16": "75,250.00",
        "box17": "5,517.50",
        "box18": "75,250.00",
        "box19": "1,736.50",
        "box20": "NYC",
    },
    {
        "filename": "w2_sarah_johnson_2024.pdf",
        "employee_name": "Sarah Johnson",
        "employee_ssn": "***-**-5678",
        "employee_address": "789 Maple Street, Queens, NY 11354",
        "employer_name": "METRO CONSULTING GROUP INC",
        "employer_ein": "98-7654321",
        "employer_address": "200 Park Avenue, New York, NY 10166",
        "tax_year": "2024",
        "box1": "92,000.00",
        "box2": "16,000.00",
        "box3": "92,000.00",
        "box4": "5,704.00",
        "box5": "92,000.00",
        "box6": "1,334.00",
        "box12a": "",
        "box13_retirement": False,
        "box15": "NY",
        "box16": "92,000.00",
        "box17": "6,740.00",
        "box18": "92,000.00",
        "box19": "2,116.00",
        "box20": "NYC",
    },
    {
        "filename": "w2_michael_chen_2024.pdf",
        "employee_name": "Michael Chen",
        "employee_ssn": "***-**-9012",
        "employee_address": "321 Pine Road, Manhattan, NY 10025",
        "employer_name": "HUDSON VALLEY TECH CORP",
        "employer_ein": "55-1234567",
        "employer_address": "350 Fifth Avenue, New York, NY 10118",
        "tax_year": "2024",
        "box1": "110,000.00",
        "box2": "22,000.00",
        "box3": "110,000.00",
        "box4": "6,820.00",
        "box5": "110,000.00",
        "box6": "1,595.00",
        "box12a": "D  6,000.00",
        "box13_retirement": True,
        "box15": "NY",
        "box16": "110,000.00",
        "box17": "8,058.00",
        "box18": "110,000.00",
        "box19": "2,530.00",
        "box20": "NYC",
    },
    {
        "filename": "w2_emily_rodriguez_2024.pdf",
        "employee_name": "Emily Rodriguez",
        "employee_ssn": "***-**-3456",
        "employee_address": "654 Elm Street, Bronx, NY 10451",
        "employer_name": "SUNRISE HEALTHCARE SERVICES",
        "employer_ein": "77-9876543",
        "employer_address": "1 Medical Plaza, New York, NY 10001",
        "tax_year": "2024",
        "box1": "68,500.00",
        "box2": "10,200.00",
        "box3": "68,500.00",
        "box4": "4,247.00",
        "box5": "68,500.00",
        "box6": "993.25",
        "box12a": "",
        "box13_retirement": True,
        "box15": "NY",
        "box16": "68,500.00",
        "box17": "5,016.50",
        "box18": "68,500.00",
        "box19": "1,575.50",
        "box20": "NYC",
    },
    {
        "filename": "1099_john_doe_2024.pdf",
        "employee_name": "John Doe",
        "employee_ssn": "***-**-1234",
        "employee_address": "456 Oak Avenue, Brooklyn, NY 11201",
        "employer_name": "FREELANCE CONTRACT SERVICES",
        "employer_ein": "33-4445555",
        "employer_address": "500 Broadway, New York, NY 10012",
        "tax_year": "2024",
        "box1": "18,750.00",
        "box2": "0.00",
        "box3": "0.00",
        "box4": "0.00",
        "box5": "0.00",
        "box6": "0.00",
        "box12a": "",
        "box13_retirement": False,
        "box15": "NY",
        "box16": "18,750.00",
        "box17": "1,375.00",
        "box18": "0.00",
        "box19": "0.00",
        "box20": "",
    },
]


def draw_box(pdf, x, y, w, h, label, value, label_size=6, value_size=9):
    from fpdf.enums import XPos, YPos
    pdf.set_xy(x, y)
    pdf.rect(x, y, w, h)
    pdf.set_font("Helvetica", "B", label_size)
    pdf.set_text_color(80, 80, 80)
    pdf.set_xy(x + 1, y + 1)
    pdf.cell(w - 2, 3, label, new_x=XPos.RIGHT, new_y=YPos.TOP)
    pdf.set_font("Helvetica", "", value_size)
    pdf.set_text_color(0, 0, 0)
    pdf.set_xy(x + 2, y + 5)
    pdf.cell(w - 4, 5, str(value), new_x=XPos.RIGHT, new_y=YPos.TOP)


def generate_w2(doc: dict, output_path: str):
    pdf = FPDF(orientation="L", unit="mm", format="Letter")
    pdf.add_page()
    pdf.set_auto_page_break(False)

    W, H = 279, 216  # Letter landscape

    # Outer border
    pdf.set_draw_color(0, 0, 0)
    pdf.set_line_width(0.5)
    pdf.rect(5, 5, W - 10, H - 10)

    # Header
    pdf.set_fill_color(20, 20, 20)
    pdf.rect(5, 5, W - 10, 10, "F")
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(255, 255, 255)
    pdf.set_xy(5, 7)
    pdf.cell(W - 10, 6, f"W-2  Wage and Tax Statement  {doc['tax_year']}", align="C")

    pdf.set_text_color(0, 0, 0)
    pdf.set_line_width(0.3)

    row1_y = 18
    row2_y = 38
    row3_y = 58
    row4_y = 80
    row5_y = 100
    row6_y = 125

    BH = 18  # box height

    # Row 1: Employee info
    draw_box(pdf, 6, row1_y, 90, BH * 1.2, "a  Employee's social security number", doc["employee_ssn"])
    draw_box(pdf, 97, row1_y, 90, BH * 1.2, "b  Employer identification number (EIN)", doc["employer_ein"])
    draw_box(pdf, 188, row1_y, 90, BH * 1.2, "Tax Year", doc["tax_year"])

    # Row 2: Names
    draw_box(pdf, 6, row2_y, 180, BH, "c  Employer's name, address, and ZIP code",
             f"{doc['employer_name']}  |  {doc['employer_address']}", label_size=6, value_size=8)
    draw_box(pdf, 188, row2_y, 90, BH, "e  Employee's name", doc["employee_name"])

    # Row 3: Address
    draw_box(pdf, 6, row3_y, 180, BH, "f  Employee's address and ZIP code", doc["employee_address"])
    draw_box(pdf, 188, row3_y, 90, BH, "", "")

    # Row 4: Wage boxes
    col_w = 45
    draw_box(pdf, 6,   row4_y, col_w, BH, "1  Wages, tips, other comp.", doc["box1"])
    draw_box(pdf, 52,  row4_y, col_w, BH, "2  Federal income tax withheld", doc["box2"])
    draw_box(pdf, 98,  row4_y, col_w, BH, "3  Social security wages", doc["box3"])
    draw_box(pdf, 144, row4_y, col_w, BH, "4  Social security tax withheld", doc["box4"])
    draw_box(pdf, 190, row4_y, col_w, BH, "5  Medicare wages and tips", doc["box5"])
    draw_box(pdf, 236, row4_y, 42, BH, "6  Medicare tax withheld", doc["box6"])

    # Row 5: Box 12 + 13
    draw_box(pdf, 6,   row5_y, col_w * 2, BH, "12a  See instructions for box 12", doc["box12a"])
    draw_box(pdf, 98,  row5_y, col_w, BH, "13  Statutory Employee", "")
    # Checkboxes
    ret_str = "[X] Retirement plan" if doc["box13_retirement"] else "[ ] Retirement plan"
    pdf.set_font("Helvetica", "", 7)
    pdf.set_xy(100, row5_y + 6)
    pdf.cell(40, 4, ret_str)

    draw_box(pdf, 144, row5_y, col_w, BH, "14  Other", "")
    draw_box(pdf, 190, row5_y, col_w * 1.5, BH, "12b", "")

    # Row 6: State
    draw_box(pdf, 6,   row6_y, 20, BH, "15  State", doc["box15"])
    draw_box(pdf, 27,  row6_y, 50, BH, "15  Employer's state ID number", "")
    draw_box(pdf, 78,  row6_y, col_w, BH, "16  State wages, tips, etc.", doc["box16"])
    draw_box(pdf, 124, row6_y, col_w, BH, "17  State income tax", doc["box17"])
    draw_box(pdf, 170, row6_y, col_w, BH, "18  Local wages, tips, etc.", doc["box18"])
    draw_box(pdf, 216, row6_y, col_w, BH, "19  Local income tax", doc["box19"])
    draw_box(pdf, 240, row6_y, 38, BH, "20  Locality name", doc["box20"])

    # Footer
    pdf.set_font("Helvetica", "I", 6)
    pdf.set_text_color(100, 100, 100)
    pdf.set_xy(6, H - 12)
    pdf.cell(W - 12, 4, "Copy B - To Be Filed With Employee's FEDERAL Tax Return  |  Department of the Treasury - Internal Revenue Service", align="C")

    pdf.output(output_path)


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    for doc in DOCS:
        path = os.path.join(OUTPUT_DIR, doc["filename"])
        generate_w2(doc, path)
        print(f"  Created {path}")
    print(f"\nDone. {len(DOCS)} PDFs written to {OUTPUT_DIR}/")


if __name__ == "__main__":
    main()
