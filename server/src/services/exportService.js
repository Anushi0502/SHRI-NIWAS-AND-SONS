import fs from "node:fs";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

export async function exportTableToExcel(filePath, title, headers, rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Report");

  sheet.mergeCells(1, 1, 1, headers.length);
  sheet.getCell(1, 1).value = title;
  sheet.getCell(1, 1).font = { bold: true, size: 14 };
  sheet.getCell(1, 1).alignment = { horizontal: "center" };

  sheet.addRow([]);
  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true };

  rows.forEach((row) => sheet.addRow(row));

  headers.forEach((header, index) => {
    const column = sheet.getColumn(index + 1);
    column.width = Math.max(String(header).length + 2, 12);
  });

  await workbook.xlsx.writeFile(filePath);
}

export async function exportTableToPdf(filePath, title, headers, rows) {
  const doc = new PDFDocument({ size: "A4", margin: 28, layout: "landscape" });
  const stream = doc.pipe(fs.createWriteStream(filePath));

  doc.fontSize(18).text(title, { align: "center" });
  doc.moveDown(0.5);

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colWidth = pageWidth / headers.length;
  let y = doc.y;

  doc.fontSize(10).font("Helvetica-Bold");
  headers.forEach((header, index) => {
    doc.text(String(header), doc.page.margins.left + colWidth * index, y, { width: colWidth });
  });
  y += 16;

  doc.font("Helvetica");
  rows.forEach((row) => {
    row.forEach((cell, index) => {
      doc.text(String(cell ?? ""), doc.page.margins.left + colWidth * index, y, { width: colWidth });
    });
    y += 16;
    if (y > doc.page.height - doc.page.margins.bottom - 24) {
      doc.addPage({ layout: "landscape" });
      y = doc.y;
    }
  });

  doc.end();
  await new Promise((resolve) => stream.on("finish", resolve));
}
