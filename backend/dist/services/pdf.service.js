"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCompletionPDF = exports.generateWorkOrderPDF = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
const generateWorkOrderPDF = async (data) => {
    const html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          .header { text-align: center; border-bottom: 2px solid #0056b3; padding-bottom: 20px; }
          .title { font-size: 24px; font-weight: bold; color: #0056b3; }
          .details { margin-top: 30px; }
          .detail-row { margin-bottom: 10px; }
          .label { font-weight: bold; display: inline-block; width: 150px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">WORK ORDER</div>
          <div>Bajaj Finserv Branch Facilities</div>
        </div>
        <div class="details">
          <div class="detail-row"><span class="label">Complaint ID:</span> ${data.complaintId}</div>
          <div class="detail-row"><span class="label">Date Raised:</span> ${new Date().toLocaleDateString()}</div>
          <div class="detail-row"><span class="label">Branch:</span> ${data.branchName}</div>
          <div class="detail-row"><span class="label">Asset:</span> ${data.assetName}</div>
          <div class="detail-row"><span class="label">Priority:</span> ${data.priority}</div>
          <div class="detail-row"><span class="label">Description:</span> ${data.description}</div>
          <div class="detail-row"><span class="label">Raised By:</span> ${data.raisedByName} (${data.raisedByRole})</div>
        </div>
        <div style="margin-top: 50px;">
          <p>Please address this issue at the earliest. Upload the service completion report once resolved.</p>
        </div>
      </body>
    </html>
  `;
    const browser = await puppeteer_1.default.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();
    await page.setContent(html);
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();
    return Buffer.from(pdfBuffer);
};
exports.generateWorkOrderPDF = generateWorkOrderPDF;
const generateCompletionPDF = async (data) => {
    const html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          .header { text-align: center; border-bottom: 2px solid #28a745; padding-bottom: 20px; }
          .title { font-size: 24px; font-weight: bold; color: #28a745; }
          .details { margin-top: 30px; }
          .detail-row { margin-bottom: 10px; }
          .label { font-weight: bold; display: inline-block; width: 180px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">SERVICE COMPLETION REPORT</div>
          <div>Bajaj Finserv Branch Facilities</div>
        </div>
        <div class="details">
          <div class="detail-row"><span class="label">Complaint ID:</span> ${data.complaintId}</div>
          <div class="detail-row"><span class="label">Resolution Date:</span> ${new Date().toLocaleDateString()}</div>
          <div class="detail-row"><span class="label">Branch:</span> ${data.branchName}</div>
          <div class="detail-row"><span class="label">Asset:</span> ${data.assetName}</div>
          <div class="detail-row"><span class="label">Resolved By:</span> ${data.resolvedByName}</div>
          <div class="detail-row"><span class="label">Resolution Notes:</span> ${data.resolutionNotes || "N/A"}</div>
          <div class="detail-row"><span class="label">Vendor Remarks:</span> ${data.vendorRemarks || "N/A"}</div>
        </div>
        <div style="margin-top: 50px; text-align: center;">
          <p>This complaint has been marked as resolved.</p>
        </div>
      </body>
    </html>
  `;
    const browser = await puppeteer_1.default.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();
    await page.setContent(html);
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();
    return Buffer.from(pdfBuffer);
};
exports.generateCompletionPDF = generateCompletionPDF;
