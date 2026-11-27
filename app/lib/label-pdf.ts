// app/lib/label-pdf.ts
// Generates printable Avery 5163 (2x5, 4"x2") adhesive QR tag sheets for costumes & tech gear.

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { AVERY_5163, computeAvery5163LabelRects } from "./phase3-helpers.ts";
import { sanitizePdfText } from "./playbill-pdf.ts";

export interface QrLabelItem {
  sku: string;
  title: string;
  subtitle: string;
  location: string;
  qrValue: string;
}

export async function generateAveryQrLabelsPdf(
  items: QrLabelItem[],
  orgName: string
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

  const safeItems = items.length > 0 ? items : [
    {
      sku: "EMPTY",
      title: "No Inventory Items Found",
      subtitle: "Add garments or equipment first",
      location: "",
      qrValue: "openbackstage://empty",
    },
  ];

  const rects = computeAvery5163LabelRects(safeItems.length);
  const totalPages = Math.max(1, Math.ceil(safeItems.length / AVERY_5163.perPage));
  const pages = Array.from({ length: totalPages }, () =>
    doc.addPage([AVERY_5163.pageWidth, AVERY_5163.pageHeight])
  );

  const cleanOrg = sanitizePdfText(orgName).toUpperCase().slice(0, 32);

  for (let i = 0; i < safeItems.length; i++) {
    const item = safeItems[i];
    const rect = rects[i];
    const page = pages[rect.pageIndex];

    // Subtle cut/border guide
    page.drawRectangle({
      x: rect.x + 2,
      y: rect.y + 2,
      width: rect.width - 4,
      height: rect.height - 4,
      borderColor: rgb(0.85, 0.85, 0.88),
      borderWidth: 0.5,
    });

    // Embed real scannable QR PNG on the left
    const qrPng = await QRCode.toBuffer(item.qrValue || item.sku, {
      type: "png",
      width: 180,
      margin: 1,
    });
    const qrImage = await doc.embedPng(qrPng);
    const qrSize = 96;
    page.drawImage(qrImage, {
      x: rect.x + 12,
      y: rect.y + (rect.height - qrSize) / 2,
      width: qrSize,
      height: qrSize,
    });

    const textX = rect.x + 12 + qrSize + 12;
    const topBase = rect.y + rect.height - 26;

    page.drawText(cleanOrg || "OPEN BACKSTAGE", {
      x: textX,
      y: topBase,
      size: 7,
      font: fontBold,
      color: rgb(0.35, 0.45, 0.65),
    });

    page.drawText(sanitizePdfText(item.sku).slice(0, 20), {
      x: textX,
      y: topBase - 18,
      size: 13,
      font: fontBold,
      color: rgb(0.08, 0.08, 0.1),
    });

    page.drawText(sanitizePdfText(item.title).slice(0, 26), {
      x: textX,
      y: topBase - 36,
      size: 10,
      font: fontBold,
      color: rgb(0.18, 0.18, 0.22),
    });

    if (item.subtitle) {
      page.drawText(sanitizePdfText(item.subtitle).slice(0, 30), {
        x: textX,
        y: topBase - 52,
        size: 8.5,
        font: fontRegular,
        color: rgb(0.35, 0.35, 0.4),
      });
    }

    if (item.location) {
      page.drawText(`LOC: ${sanitizePdfText(item.location).slice(0, 26)}`, {
        x: textX,
        y: rect.y + 20,
        size: 8,
        font: fontBold,
        color: rgb(0.25, 0.25, 0.3),
      });
    }
  }

  return doc.save();
}
