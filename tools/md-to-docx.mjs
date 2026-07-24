/**
 * Renders AI-Incident-Response-Playbook.md to a formatted .docx.
 * The Markdown file is the single source of truth; this script only styles it.
 *
 *   npm install docx && node tools/md-to-docx.mjs
 */
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, ShadingType, AlignmentType, BorderStyle, LevelFormat, TableOfContents,
  PageBreak, Footer, Header, PageNumber, VerticalAlign,
} from "docx";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "AI-Incident-Response-Playbook.md");
const OUT = path.join(ROOT, "AI-Incident-Response-Playbook.docx");

const NAVY = "1F3864", MIDBLUE = "2E5496", BAND = "F2F6FB", GRAY = "6B6B6B";
const BODY_W = 9026; // A4 minus 1" margins, in DXA

/* ---------- inline formatting: **bold**, *italic*, `code` ---------- */
function inline(text, base = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), ...base }));
    const t = m[0];
    if (t.startsWith("**")) out.push(new TextRun({ text: t.slice(2, -2), bold: true, ...base }));
    else if (t.startsWith("`")) out.push(new TextRun({ text: t.slice(1, -1), font: "Consolas", ...base }));
    else out.push(new TextRun({ text: t.slice(1, -1), italics: true, ...base }));
    last = m.index + t.length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), ...base }));
  return out.length ? out : [new TextRun({ text: "", ...base })];
}

/* ---------- block builders ---------- */
const para = (text, opts = {}) => new Paragraph({
  children: inline(text, opts.run || {}),
  spacing: { after: 120, line: 276, ...(opts.spacing || {}) },
  alignment: opts.align, indent: opts.indent, border: opts.border,
});

// A paragraph that is entirely italic reads as an author's note -> callout bar.
const callout = (text) => new Paragraph({
  children: inline(text.replace(/^\*|\*$/g, ""), { italics: true, color: GRAY, size: 20 }),
  spacing: { after: 160 }, indent: { left: 240 },
  border: { left: { style: BorderStyle.SINGLE, size: 12, color: MIDBLUE, space: 8 } },
});

const heading = (text, level) => new Paragraph({
  heading: level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
  children: inline(text),
  spacing: { before: level === 1 ? 340 : level === 2 ? 260 : 200, after: level === 1 ? 160 : 120 },
});

let numInstance = 0;
const listItem = (text, ordered) => new Paragraph({
  children: inline(text),
  numbering: { reference: ordered ? "num" : "bul", level: 0, ...(ordered ? { instance: numInstance } : {}) },
  spacing: { after: 80, line: 276 },
});

function codeBlock(lines) {
  return lines.map((l, i) => new Paragraph({
    children: [new TextRun({ text: l === "" ? " " : l, font: "Consolas", size: 17 })],
    shading: { type: ShadingType.CLEAR, fill: "F4F4F4", color: "auto" },
    spacing: { after: 0, line: 240 }, indent: { left: 240, right: 240 },
    border: {
      left: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
      ...(i === 0 ? { top: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" } } : {}),
      ...(i === lines.length - 1 ? { bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" } } : {}),
    },
  }));
}

/** Column widths proportional to content length, clamped so no column starves or dominates. */
function columnWidths(rows, nCols) {
  const weights = Array.from({ length: nCols }, (_, i) =>
    Math.max(4, rows.reduce((s, r) => s + (r[i] || "").length, 0) / rows.length));
  const total = weights.reduce((a, b) => a + b, 0);
  let fracs = weights.map(w => w / total);
  const MIN = 0.055, MAX = 0.46;
  fracs = fracs.map(f => Math.min(MAX, Math.max(MIN, f)));
  const s = fracs.reduce((a, b) => a + b, 0);
  fracs = fracs.map(f => f / s);
  return fracs.map(f => Math.round(f * BODY_W));
}

function table(header, rows) {
  const nCols = header.length;
  const widths = columnWidths([header, ...rows], nCols);
  const size = nCols >= 7 ? 15 : nCols >= 5 ? 17 : 18;
  const cell = (text, i, opts) => new TableCell({
    width: { size: widths[i], type: WidthType.DXA },
    shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill, color: "auto" } : undefined,
    margins: { top: 55, bottom: 55, left: 80, right: 80 },
    verticalAlign: opts.head ? VerticalAlign.CENTER : undefined,
    children: [new Paragraph({
      children: inline(text, { size, bold: opts.head || undefined, color: opts.head ? "FFFFFF" : undefined }),
      spacing: { after: 20, line: 240 },
      alignment: text.length <= 12 && nCols >= 5 ? AlignmentType.CENTER : undefined,
    })],
  });
  return [
    new Table({
      columnWidths: widths, width: { size: BODY_W, type: WidthType.DXA },
      rows: [
        new TableRow({ tableHeader: true, children: header.map((h, i) => cell(h, i, { head: true, fill: NAVY })) }),
        ...rows.map((r, ri) => new TableRow({
          children: Array.from({ length: nCols }, (_, i) => cell(r[i] || "", i, { fill: ri % 2 ? BAND : null })),
        })),
      ],
    }),
    new Paragraph({ spacing: { after: 120 }, children: [] }),
  ];
}

/** The Markdown carries a Mermaid flowchart; Word gets an equivalent styled sequence. */
const MERMAID_STEPS = [
  "**6.1 DETECTION & INTAKE** — automated monitoring & triage layer (Sentinel) · user reports · internal red team & employees · external (researchers, vendors, regulators, media) → single intake queue, structured record, snapshot triggered",
  "**6.2 TRIAGE** — AI in the causal chain? (No → standard IR/support, with disposition) · assign Category C1–C7 + Severity SEV-1–4 · scope: instance or class? · pull in Privacy/Legal if clocks may run",
  "**6.3 ESCALATION** — SEV-1/2: declare incident, assign IC, open channel, exec notification per matrix · SEV-3/4: queue to category owner · assess external notification clocks",
  "**6.4 CONTAINMENT** — preserve behavioral snapshot BEFORE fixes · category playbook actions · escalate ladder until harm verifiably stopped (T0)",
  "**6.5 RCA** — contributing-factors analysis across data / model / prompt & config / integration / human & process · standing questions: why did evals and monitoring miss it?",
  "**6.6 REMEDIATION** — instance, class, and program-level fixes · redeployment gate with incident-derived regression evals · observation window to formal closure (T+14)",
  "**6.7 POST-INCIDENT REVIEW** — blameless PIR → feedback loops: risk register · eval suites · monitoring thresholds · model documentation · policy & SOP · tabletop scenarios (loops back into detection)",
];
function mermaidFallback() {
  const out = [];
  MERMAID_STEPS.forEach((s, i) => {
    out.push(new Table({
      columnWidths: [BODY_W], width: { size: BODY_W, type: WidthType.DXA },
      rows: [new TableRow({
        children: [new TableCell({
          width: { size: BODY_W, type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: i === MERMAID_STEPS.length - 1 ? "DDE7F5" : "EAF0F8", color: "auto" },
          margins: { top: 90, bottom: 90, left: 160, right: 160 },
          children: [new Paragraph({ children: inline(s, { size: 19 }), alignment: AlignmentType.CENTER, spacing: { after: 0, line: 240 } })],
        })],
      })],
    }));
    if (i < MERMAID_STEPS.length - 1) {
      out.push(new Paragraph({
        children: [new TextRun({ text: "▼", color: MIDBLUE, size: 18 })],
        alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40 },
      }));
    }
  });
  out.push(new Paragraph({ spacing: { after: 160 }, children: [] }));
  return out;
}

/* ---------- parse Markdown ---------- */
const md = fs.readFileSync(SRC, "utf8").split(/\r?\n/);
const body = [];
let i = 0;

// Title page: leading "# title" + subtitle line + blockquote note.
const title = md[0].replace(/^#\s*/, "");
i = 1;
let subtitle = "", note = "";
for (; i < md.length; i++) {
  const l = md[i].trim();
  if (l === "" ) continue;
  if (l.startsWith("> ")) { note = l.replace(/^>\s*/, "").replace(/^\*|\*$/g, ""); continue; }
  if (l === "---") { i++; break; }
  if (!subtitle) subtitle = l.replace(/\*\*/g, "");
}
body.push(
  new Paragraph({ spacing: { before: 2600 }, children: [] }),
  new Paragraph({ children: [new TextRun({ text: title, bold: true, size: 56, color: NAVY })], alignment: AlignmentType.CENTER, spacing: { after: 220 } }),
  new Paragraph({ children: [new TextRun({ text: subtitle, size: 26, color: MIDBLUE })], alignment: AlignmentType.CENTER, spacing: { after: 600 } }),
  new Paragraph({ children: [new TextRun({ text: note, italics: true, size: 19, color: GRAY })], alignment: AlignmentType.CENTER, indent: { left: 800, right: 800 } }),
  new Paragraph({ children: [new PageBreak()] }),
  new Paragraph({ children: [new TextRun({ text: "Table of Contents", bold: true, size: 32, color: NAVY })], spacing: { after: 200 } }),
  new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }),
  new Paragraph({ children: [new PageBreak()] }),
);

const isTableRow = (l) => /^\|.*\|\s*$/.test(l);
const splitRow = (l) => l.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());

for (; i < md.length; i++) {
  const line = md[i];
  const t = line.trim();

  if (t === "" || t === "---") continue;

  // headings
  const h = t.match(/^(#{2,4})\s+(.*)$/);
  if (h) {
    const level = h[1].length - 1;
    if (/^Appendix/i.test(h[2]) && level === 1) body.push(new Paragraph({ children: [new PageBreak()] }));
    body.push(heading(h[2], level));
    continue;
  }

  // fenced code (```mermaid gets the styled fallback)
  if (t.startsWith("```")) {
    const lang = t.slice(3).trim();
    const buf = [];
    for (i++; i < md.length && !md[i].trim().startsWith("```"); i++) buf.push(md[i]);
    if (lang === "mermaid") body.push(...mermaidFallback());
    else body.push(...codeBlock(buf), new Paragraph({ spacing: { after: 140 }, children: [] }));
    continue;
  }

  // tables
  if (isTableRow(t) && i + 1 < md.length && /^\|[\s:|-]+\|\s*$/.test(md[i + 1].trim())) {
    const header = splitRow(t);
    const rows = [];
    for (i += 2; i < md.length && isTableRow(md[i].trim()); i++) rows.push(splitRow(md[i]));
    i--;
    body.push(...table(header, rows));
    continue;
  }

  // lists
  const bullet = t.match(/^[-*]\s+(.*)$/);
  const ordered = t.match(/^\d+\.\s+(.*)$/);
  if (bullet || ordered) {
    if (ordered) numInstance++;
    let first = true;
    for (; i < md.length; i++) {
      const li = md[i].trim();
      const b = li.match(/^[-*]\s+(.*)$/), o = li.match(/^\d+\.\s+(.*)$/);
      if (!b && !o) break;
      if (!first && ((bullet && o) || (ordered && b))) break;
      body.push(listItem((b || o)[1], !!o));
      first = false;
    }
    i--;
    continue;
  }

  // blockquote
  if (t.startsWith("> ")) { body.push(callout(t.replace(/^>\s*/, ""))); continue; }

  // paragraph (fully-italic ones become callouts)
  if (/^\*[^*].*\*$/.test(t) && !t.includes("**")) body.push(callout(t));
  else body.push(para(t));
}

/* ---------- assemble ---------- */
const versionMatch = fs.readFileSync(SRC, "utf8").match(/\|\s*Version\s*\|\s*([\d.]+)\s*\|/);
const version = versionMatch ? versionMatch[1] : "";
const docId = (fs.readFileSync(SRC, "utf8").match(/\|\s*Document ID\s*\|\s*([\w-]+)\s*\|/) || [])[1] || "";

const doc = new Document({
  features: { updateFields: true },
  styles: {
    default: {
      document: { run: { font: "Calibri", size: 22, color: "1A1A1A" } },
      heading1: { run: { font: "Calibri", size: 32, bold: true, color: NAVY }, paragraph: { spacing: { before: 340, after: 160 } } },
      heading2: { run: { font: "Calibri", size: 26, bold: true, color: MIDBLUE }, paragraph: { spacing: { before: 260, after: 120 } } },
      heading3: { run: { font: "Calibri", size: 23, bold: true, color: "404040" }, paragraph: { spacing: { before: 200, after: 100 } } },
    },
  },
  numbering: {
    config: [
      { reference: "bul", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 440, hanging: 220 } } } }] },
      { reference: "num", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 440, hanging: 260 } } } }] },
    ],
  },
  sections: [{
    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
    headers: {
      default: new Header({
        children: [new Paragraph({
          children: [new TextRun({ text: `${title} — ${subtitle.split("—")[0].trim()}`, size: 16, color: "8A8A8A" })],
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "D0D0D0", space: 4 } },
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({ text: `${docId} v${version}   ·   Page `, size: 16, color: "8A8A8A" }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "8A8A8A" }),
          ],
        })],
      }),
    },
    children: body,
  }],
});

fs.writeFileSync(OUT, await Packer.toBuffer(doc));
console.log(`Wrote ${path.basename(OUT)} (v${version}) — ${body.length} blocks`);
