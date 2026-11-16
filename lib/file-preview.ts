import { unzipSync, strFromU8 } from "fflate";

export type DocxRun = {
  text: string;
  bold?: boolean;
  italic?: boolean;
};

export type DocxBlock =
  | { kind: "heading"; level: number; runs: DocxRun[] }
  | { kind: "paragraph"; bullet: boolean; runs: DocxRun[] }
  | { kind: "table"; rows: string[][] };

export type PptxSlide = {
  index: number;
  paragraphs: string[];
};

export type XlsxSheet = {
  name: string;
  rows: string[][];
  truncated?: boolean;
};

export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const bin = atob(base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function dataUrlToBlobUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;]+);base64,/);
  const mime = match?.[1] ?? "application/octet-stream";
  const bytes = dataUrlToBytes(dataUrl);
  const buf = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buf).set(bytes);
  return URL.createObjectURL(new Blob([buf], { type: mime }));
}

function parseXml(bytes: Uint8Array): Document {
  return new DOMParser().parseFromString(strFromU8(bytes), "application/xml");
}

function localName(el: Element): string {
  return el.localName || el.tagName.split(":").pop() || "";
}

function childElements(parent: Element, name?: string): Element[] {
  const out: Element[] = [];
  for (let i = 0; i < parent.children.length; i++) {
    const c = parent.children[i];
    if (!name || localName(c) === name) out.push(c);
  }
  return out;
}

function extractParagraphRuns(p: Element): DocxRun[] {
  const runs: DocxRun[] = [];
  for (const child of childElements(p)) {
    if (localName(child) !== "r") continue;
    const rPr = childElements(child, "rPr")[0];
    const bold = rPr ? childElements(rPr, "b").length > 0 : false;
    const italic = rPr ? childElements(rPr, "i").length > 0 : false;
    let text = "";
    for (const node of childElements(child)) {
      const ln = localName(node);
      if (ln === "t") text += node.textContent ?? "";
      else if (ln === "tab") text += "\t";
      else if (ln === "br") text += "\n";
    }
    if (text) runs.push({ text, bold, italic });
  }
  return runs;
}

export function parseDocx(bytes: Uint8Array): DocxBlock[] {
  const files = unzipSync(bytes);
  const docBytes = files["word/document.xml"];
  if (!docBytes) throw new Error("Missing word/document.xml");

  const xml = parseXml(docBytes);
  const body = xml.getElementsByTagNameNS("*", "body")[0] ?? xml.documentElement;
  const blocks: DocxBlock[] = [];

  for (const el of childElements(body)) {
    const ln = localName(el);
    if (ln === "p") {
      const pPr = childElements(el, "pPr")[0];
      const pStyle = pPr ? childElements(pPr, "pStyle")[0] : undefined;
      const styleVal = pStyle?.getAttribute("w:val") ?? pStyle?.getAttribute("val") ?? "";
      const bullet = pPr ? childElements(pPr, "numPr").length > 0 : false;
      const runs = extractParagraphRuns(el);
      if (!runs.length) continue;

      const headingMatch = styleVal.match(/Heading(\d)/i);
      if (headingMatch) {
        blocks.push({ kind: "heading", level: Number(headingMatch[1]), runs });
      } else if (/^Title$/i.test(styleVal)) {
        blocks.push({ kind: "heading", level: 1, runs });
      } else {
        blocks.push({ kind: "paragraph", bullet, runs });
      }
    } else if (ln === "tbl") {
      const rows: string[][] = [];
      for (const tr of childElements(el, "tr")) {
        const row: string[] = [];
        for (const tc of childElements(tr, "tc")) {
          const cellText = childElements(tc, "p")
            .map((p) =>
              extractParagraphRuns(p)
                .map((r) => r.text)
                .join("")
            )
            .filter(Boolean)
            .join("\n");
          row.push(cellText);
        }
        if (row.length) rows.push(row);
      }
      if (rows.length) blocks.push({ kind: "table", rows });
    }
  }

  return blocks;
}

export function parsePptx(bytes: Uint8Array): PptxSlide[] {
  const files = unzipSync(bytes);
  const slideEntries = Object.keys(files)
    .map((name) => {
      const m = name.match(/^ppt\/slides\/slide(\d+)\.xml$/);
      return m ? { name, index: Number(m[1]) } : null;
    })
    .filter((x): x is { name: string; index: number } => x !== null)
    .sort((a, b) => a.index - b.index);

  return slideEntries.map(({ name, index }) => {
    const xml = parseXml(files[name]);
    const pNodes = Array.from(xml.getElementsByTagNameNS("*", "p"));
    const paragraphs: string[] = [];
    for (const p of pNodes) {
      const tNodes = Array.from(p.getElementsByTagNameNS("*", "t"));
      const text = tNodes.map((t) => t.textContent ?? "").join("").trim();
      if (text) paragraphs.push(text);
    }
    return { index, paragraphs };
  });
}

function colRefToIndex(ref: string): number {
  const letters = ref.replace(/\d+$/, "").toUpperCase();
  let idx = 0;
  for (let i = 0; i < letters.length; i++) {
    idx = idx * 26 + (letters.charCodeAt(i) - 64);
  }
  return Math.max(0, idx - 1);
}

const MAX_XLSX_ROWS = 300;
const MAX_XLSX_COLS = 40;

export function parseXlsx(bytes: Uint8Array): XlsxSheet[] {
  const files = unzipSync(bytes);

  // Shared strings
  const sharedStrings: string[] = [];
  if (files["xl/sharedStrings.xml"]) {
    const ssXml = parseXml(files["xl/sharedStrings.xml"]);
    for (const si of Array.from(ssXml.getElementsByTagNameNS("*", "si"))) {
      const text = Array.from(si.getElementsByTagNameNS("*", "t"))
        .map((t) => t.textContent ?? "")
        .join("");
      sharedStrings.push(text);
    }
  }

  // Resolve sheet names -> paths
  const sheetSpecs: { name: string; path: string }[] = [];
  if (files["xl/workbook.xml"] && files["xl/_rels/workbook.xml.rels"]) {
    const relXml = parseXml(files["xl/_rels/workbook.xml.rels"]);
    const relMap = new Map<string, string>();
    for (const rel of Array.from(relXml.getElementsByTagName("*"))) {
      if (localName(rel) !== "Relationship") continue;
      const id = rel.getAttribute("Id");
      const target = rel.getAttribute("Target");
      if (id && target) {
        const clean = target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.?\//, "")}`;
        relMap.set(id, clean);
      }
    }

    const wbXml = parseXml(files["xl/workbook.xml"]);
    for (const sheet of Array.from(wbXml.getElementsByTagNameNS("*", "sheet"))) {
      const name = sheet.getAttribute("name") || "Sheet";
      const rId =
        sheet.getAttribute("r:id") ||
        sheet.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
      const path = rId ? relMap.get(rId) : undefined;
      if (path && files[path]) sheetSpecs.push({ name, path });
    }
  }

  // Fallback if workbook relationships didn't resolve
  if (!sheetSpecs.length) {
    Object.keys(files)
      .filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k))
      .sort()
      .forEach((path, i) => sheetSpecs.push({ name: `Sheet ${i + 1}`, path }));
  }

  return sheetSpecs.map(({ name, path }) => {
    const xml = parseXml(files[path]);
    const rowNodes = Array.from(xml.getElementsByTagNameNS("*", "row"));
    const truncated = rowNodes.length > MAX_XLSX_ROWS;
    const rows: string[][] = [];
    let maxCols = 0;

    for (const rowEl of rowNodes.slice(0, MAX_XLSX_ROWS)) {
      const rowCells: string[] = [];
      let fallbackCol = 0;
      for (const c of childElements(rowEl, "c")) {
        const ref = c.getAttribute("r");
        const colIdx = ref ? colRefToIndex(ref) : fallbackCol;
        fallbackCol = colIdx + 1;
        if (colIdx >= MAX_XLSX_COLS) continue;

        const type = c.getAttribute("t");
        let val = "";
        if (type === "inlineStr") {
          val = Array.from(c.getElementsByTagNameNS("*", "t"))
            .map((t) => t.textContent ?? "")
            .join("");
        } else {
          const v = childElements(c, "v")[0]?.textContent ?? "";
          if (type === "s") val = sharedStrings[Number(v)] ?? "";
          else if (type === "b") val = v === "1" ? "TRUE" : "FALSE";
          else val = v;
        }
        rowCells[colIdx] = val;
        if (colIdx + 1 > maxCols) maxCols = colIdx + 1;
      }
      rows.push(rowCells);
    }

    // Pad rows to uniform column length
    const normalized = rows.map((r) => {
      const out = Array.from({ length: maxCols }, (_, i) => r[i] ?? "");
      return out;
    });

    return { name, rows: normalized, truncated };
  });
}

export function xlsxColLabel(index: number): string {
  let n = index + 1;
  let label = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
}
