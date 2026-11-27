// app/lib/playbill-pdf.ts
// Generates print-ready half-letter (5.5 x 8.5 in) Playbill PDFs and
// saddle-stitch US Letter landscape (11 x 8.5 in) imposed booklets using pdf-lib.

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { buildBookletImpositionSheets } from "./ticketing-helpers.ts";

export const HALF_LETTER_WIDTH = 396; // 5.5 inches * 72 pt/in
export const HALF_LETTER_HEIGHT = 612; // 8.5 inches * 72 pt/in
export const LETTER_LANDSCAPE_WIDTH = 792; // 11 inches * 72 pt/in
export const LETTER_LANDSCAPE_HEIGHT = 612; // 8.5 inches * 72 pt/in

const MARGIN_X = 36;
const MARGIN_TOP = 42;
const MARGIN_BOTTOM = 42;
const CONTENT_WIDTH = HALF_LETTER_WIDTH - MARGIN_X * 2;

export interface PlaybillCastEntry {
  id?: number;
  name: string;
  role: string;
  bio: string;
  ad: string;
}

export interface PlaybillPdfInput {
  orgName: string;
  showTitle: string;
  location?: string | null;
  datesLabel?: string | null;
  posterBytes?: Uint8Array | null;
  posterMime?: "image/jpeg" | "image/png" | null;
  cast: PlaybillCastEntry[];
  mode?: "reader" | "booklet";
}

/**
 * Standard PDF Type-1 fonts use WinAnsi encoding. Replace curly quotes, dashes,
 * ellipses, and strip unsupported glyphs (e.g. emojis) so pdf-lib never throws.
 */
export function sanitizePdfText(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, "")
    .trim();
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const clean = sanitizePdfText(text);
  if (!clean) return [];

  const paragraphs = clean.split(/\r?\n/);
  const lines: string[] = [];

  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }

    let current = words[0];
    for (let i = 1; i < words.length; i++) {
      const candidate = `${current} ${words[i]}`;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
      } else {
        lines.push(current);
        current = words[i];
      }
    }
    lines.push(current);
  }

  return lines;
}

function drawCentered(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  size: number,
  color = rgb(0.1, 0.1, 0.12)
) {
  const clean = sanitizePdfText(text);
  const w = font.widthOfTextAtSize(clean, size);
  page.drawText(clean, {
    x: (HALF_LETTER_WIDTH - w) / 2,
    y,
    size,
    font,
    color,
  });
}

function drawPageFooter(page: PDFPage, pageNumber: number, font: PDFFont) {
  const label = String(pageNumber);
  const w = font.widthOfTextAtSize(label, 8.5);
  page.drawText(label, {
    x: (HALF_LETTER_WIDTH - w) / 2,
    y: 20,
    size: 8.5,
    font,
    color: rgb(0.45, 0.45, 0.48),
  });
}

function drawSectionHeader(page: PDFPage, title: string, fontBold: PDFFont): number {
  const y = HALF_LETTER_HEIGHT - MARGIN_TOP;
  drawCentered(page, title.toUpperCase(), y, fontBold, 13, rgb(0.08, 0.08, 0.1));
  page.drawLine({
    start: { x: MARGIN_X + 40, y: y - 7 },
    end: { x: HALF_LETTER_WIDTH - MARGIN_X - 40, y: y - 7 },
    thickness: 0.75,
    color: rgb(0.75, 0.75, 0.78),
  });
  return y - 26;
}

export async function generatePlaybillPdf(input: PlaybillPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const sansBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const ink = rgb(0.1, 0.1, 0.12);
  const muted = rgb(0.42, 0.42, 0.46);
  const accent = rgb(0.15, 0.25, 0.55);

  const addHalfLetterPage = () => doc.addPage([HALF_LETTER_WIDTH, HALF_LETTER_HEIGHT]);

  // ==========================================================================
  // PAGE 1: FRONT COVER
  // ==========================================================================
  const cover = addHalfLetterPage();
  // Double editorial border
  cover.drawRectangle({
    x: 20,
    y: 20,
    width: HALF_LETTER_WIDTH - 40,
    height: HALF_LETTER_HEIGHT - 40,
    borderColor: rgb(0.15, 0.15, 0.18),
    borderWidth: 1.5,
  });
  cover.drawRectangle({
    x: 25,
    y: 25,
    width: HALF_LETTER_WIDTH - 50,
    height: HALF_LETTER_HEIGHT - 50,
    borderColor: rgb(0.65, 0.65, 0.7),
    borderWidth: 0.5,
  });

  drawCentered(cover, (input.orgName || "THEATER COMPANY").toUpperCase(), 552, sansBold, 9.5, muted);
  drawCentered(cover, "PRESENTS", 536, serifItalic, 10, muted);

  const titleLines = wrapText(input.showTitle || "Production", serifBold, 24, CONTENT_WIDTH - 16);
  let titleY = 502;
  for (const line of titleLines.slice(0, 3)) {
    drawCentered(cover, line, titleY, serifBold, 24, ink);
    titleY -= 28;
  }

  // Optional Show Poster Artwork
  if (input.posterBytes && input.posterBytes.length > 0 && input.posterMime) {
    try {
      const img =
        input.posterMime === "image/png"
          ? await doc.embedPng(input.posterBytes)
          : await doc.embedJpg(input.posterBytes);

      const maxW = 240;
      const maxH = 260;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const imgY = Math.max(130, titleY - drawH - 18);
      cover.drawImage(img, {
        x: (HALF_LETTER_WIDTH - drawW) / 2,
        y: imgY,
        width: drawW,
        height: drawH,
      });
    } catch {
      // Skip invalid image bytes cleanly
    }
  } else {
    // Clean ornamental rule when no poster image is present
    cover.drawLine({
      start: { x: 110, y: titleY - 12 },
      end: { x: HALF_LETTER_WIDTH - 110, y: titleY - 12 },
      thickness: 1,
      color: accent,
    });
    drawCentered(cover, "OFFICIAL PLAYBILL", titleY - 36, sansBold, 10, accent);
  }

  if (input.datesLabel) {
    drawCentered(cover, input.datesLabel, 78, serifBold, 11, ink);
  }
  if (input.location) {
    drawCentered(cover, input.location, 60, serif, 10, muted);
  }

  // ==========================================================================
  // CAST LIST
  // ==========================================================================
  const sortedCast = [...input.cast].sort((a, b) => a.name.localeCompare(b.name));
  if (sortedCast.length > 0) {
    let page = addHalfLetterPage();
    let y = drawSectionHeader(page, "Cast of Characters", serifBold);

    for (const entry of sortedCast) {
      if (y < MARGIN_BOTTOM + 18) {
        page = addHalfLetterPage();
        y = drawSectionHeader(page, "Cast of Characters (Cont.)", serifBold);
      }
      const roleText = sanitizePdfText(entry.role || "Ensemble");
      const nameText = sanitizePdfText(entry.name || "Cast Member");
      const nameWidth = serifBold.widthOfTextAtSize(nameText, 10);

      page.drawText(roleText.slice(0, 38), {
        x: MARGIN_X,
        y,
        size: 10,
        font: serifItalic,
        color: muted,
      });
      page.drawText(nameText, {
        x: HALF_LETTER_WIDTH - MARGIN_X - nameWidth,
        y,
        size: 10,
        font: serifBold,
        color: ink,
      });

      y -= 16;
    }
  }

  // ==========================================================================
  // ACTOR BIOGRAPHIES
  // ==========================================================================
  const bios = sortedCast.filter((c) => sanitizePdfText(c.bio).length > 0);
  if (bios.length > 0) {
    let page = addHalfLetterPage();
    let y = drawSectionHeader(page, "Who's Who in the Cast", serifBold);

    for (const actor of bios) {
      const bioLines = wrapText(actor.bio, serif, 9.5, CONTENT_WIDTH);
      const blockHeight = 14 + bioLines.length * 12.5 + 12;

      if (y - blockHeight < MARGIN_BOTTOM) {
        page = addHalfLetterPage();
        y = drawSectionHeader(page, "Who's Who in the Cast (Cont.)", serifBold);
      }

      const nameStr = sanitizePdfText(actor.name);
      const roleStr = sanitizePdfText(actor.role || "Ensemble");
      page.drawText(nameStr, {
        x: MARGIN_X,
        y,
        size: 10.5,
        font: serifBold,
        color: ink,
      });
      const nameW = serifBold.widthOfTextAtSize(nameStr, 10.5);
      page.drawText(` — ${roleStr}`, {
        x: MARGIN_X + nameW,
        y,
        size: 9.5,
        font: serifItalic,
        color: accent,
      });

      y -= 13.5;
      for (const line of bioLines) {
        if (y < MARGIN_BOTTOM) {
          page = addHalfLetterPage();
          y = drawSectionHeader(page, "Who's Who in the Cast (Cont.)", serifBold);
        }
        if (line) {
          page.drawText(line, {
            x: MARGIN_X,
            y,
            size: 9.5,
            font: serif,
            color: ink,
          });
        }
        y -= 12.5;
      }
      y -= 8;
    }
  }

  // ==========================================================================
  // CONGRATS ADS ("BREAK A LEG!")
  // ==========================================================================
  const ads = sortedCast.filter((c) => sanitizePdfText(c.ad).length > 0);
  if (ads.length > 0) {
    let page = addHalfLetterPage();
    let y = drawSectionHeader(page, "Break a Leg!", serifBold);

    for (const actor of ads) {
      const adLines = wrapText(`"${actor.ad}"`, serifItalic, 10, CONTENT_WIDTH - 24);
      const boxHeight = 24 + adLines.length * 13 + 12;

      if (y - boxHeight < MARGIN_BOTTOM) {
        page = addHalfLetterPage();
        y = drawSectionHeader(page, "Break a Leg! (Cont.)", serifBold);
      }

      page.drawRectangle({
        x: MARGIN_X,
        y: y - boxHeight + 10,
        width: CONTENT_WIDTH,
        height: boxHeight,
        borderColor: rgb(0.75, 0.75, 0.8),
        borderWidth: 0.75,
        color: rgb(0.98, 0.98, 0.99),
      });

      const headerY = y - 8;
      page.drawText(`FOR ${sanitizePdfText(actor.name).toUpperCase()}`, {
        x: MARGIN_X + 12,
        y: headerY,
        size: 8.5,
        font: sansBold,
        color: accent,
      });

      let lineY = headerY - 15;
      for (const line of adLines) {
        page.drawText(line, {
          x: MARGIN_X + 12,
          y: lineY,
          size: 10,
          font: serifItalic,
          color: ink,
        });
        lineY -= 13;
      }

      y -= boxHeight + 12;
    }
  }

  // ==========================================================================
  // BACK COVER
  // ==========================================================================
  const backCover = addHalfLetterPage();
  drawCentered(backCover, "Thank you for supporting live youth theater!", 340, serifItalic, 12, ink);
  drawCentered(backCover, (input.orgName || "Open Backstage").toUpperCase(), 316, sansBold, 10, accent);
  drawCentered(backCover, "Program generated with Open Backstage", 48, sans, 8, muted);

  // Add page numbers to interior pages (skip cover & back cover)
  const pages = doc.getPages();
  for (let i = 1; i < pages.length - 1; i++) {
    drawPageFooter(pages[i], i + 1, sans);
  }

  if (input.mode !== "booklet") {
    return doc.save();
  }

  // ==========================================================================
  // SADDLE-STITCH BOOKLET IMPOSITION (11 x 8.5 in Landscape US Letter)
  // ==========================================================================
  const bookletDoc = await PDFDocument.create();
  const embeddedPages = await bookletDoc.embedPages(pages);
  const { sheets } = buildBookletImpositionSheets(embeddedPages.length);

  const drawSide = (pair: [number | null, number | null]) => {
    const sheetPage = bookletDoc.addPage([LETTER_LANDSCAPE_WIDTH, LETTER_LANDSCAPE_HEIGHT]);
    const [leftNum, rightNum] = pair;

    if (leftNum !== null && embeddedPages[leftNum - 1]) {
      sheetPage.drawPage(embeddedPages[leftNum - 1], {
        x: 0,
        y: 0,
        width: HALF_LETTER_WIDTH,
        height: HALF_LETTER_HEIGHT,
      });
    }
    if (rightNum !== null && embeddedPages[rightNum - 1]) {
      sheetPage.drawPage(embeddedPages[rightNum - 1], {
        x: HALF_LETTER_WIDTH,
        y: 0,
        width: HALF_LETTER_WIDTH,
        height: HALF_LETTER_HEIGHT,
      });
    }
  };

  for (const sheet of sheets) {
    drawSide(sheet.front);
    drawSide(sheet.back);
  }

  return bookletDoc.save();
}
