// Turns an uploaded Excel/CSV file or pasted Word/PDF text into rows for the question and test importers.
import { parseCsv, parseTextQuestions } from '@/lib/question-import';

/** Reads an uploaded file into rows: Excel (.xlsx), Word (.docx), CSV, tab-separated, or plain text questions. */
export async function readFile(file: File): Promise<string[][]> {
  if (/\.docx$/i.test(file.name)) return parseTextQuestions(await docxText(file));
  if (/\.xlsx$/i.test(file.name)) {
    const { readSheet } = await import('read-excel-file/browser');
    const rows = await readSheet(file);
    return rows.map(r => r.map(c => (c == null ? '' : c instanceof Date ? c.toISOString().slice(0, 10) : String(c))));
  }
  return readText(await file.text());
}

/** Text pasted or uploaded: a sheet (tabs or commas with a heading row) or questions typed like a worksheet. */
export function readText(text: string): string[][] {
  const first = text.trim().split(/\r?\n/)[0] ?? '';
  if (first.includes('\t')) return text.split(/\r?\n/).filter(l => l.trim()).map(l => l.split('\t'));
  if (/question/i.test(first) && first.split(',').length >= 4) return parseCsv(text);
  return parseTextQuestions(text);
}

const ROMAN = [[1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']] as const;
function fmt(n: number, kind: string) {
  if (kind === 'lowerLetter') return String.fromCharCode(96 + ((n - 1) % 26) + 1);
  if (kind === 'upperLetter') return String.fromCharCode(64 + ((n - 1) % 26) + 1);
  if (kind === 'lowerRoman' || kind === 'upperRoman') {
    let r = '', x = n;
    for (const [v, s] of ROMAN) while (x >= v) { r += s; x -= v; }
    return kind === 'upperRoman' ? r.toUpperCase() : r;
  }
  return String(n);
}

/**
 * The text of a Word file, one line per paragraph. Word's automatic numbering ("1.", "a)")
 * is not stored as text, so it is rebuilt from the document's numbering settings.
 */
async function docxText(file: File): Promise<string> {
  const { unzipSync, strFromU8 } = await import('fflate');
  const zip = unzipSync(new Uint8Array(await file.arrayBuffer()), { filter: f => ['word/document.xml', 'word/numbering.xml', 'word/styles.xml'].includes(f.name) });
  if (!zip['word/document.xml']) throw new Error('Not a Word document');
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const parse = (x: string) => new DOMParser().parseFromString(x, 'application/xml');
  const attr = (el: Element | null | undefined, name: string) => el?.getAttributeNS(W, name) ?? el?.getAttribute('w:' + name) ?? null;
  const kids = (el: Element | Document, name: string) => Array.from(el.getElementsByTagNameNS(W, name));

  // numId → level → { format, text like "%1." , start }
  const levels = new Map<string, Map<string, { fmt: string; text: string; start: number }>>();
  if (zip['word/numbering.xml']) {
    const nx = parse(strFromU8(zip['word/numbering.xml']));
    const abstract = new Map<string, Element>();
    for (const a of kids(nx, 'abstractNum')) abstract.set(attr(a, 'abstractNumId') ?? '', a);
    for (const n of kids(nx, 'num')) {
      const a = abstract.get(attr(kids(n, 'abstractNumId')[0], 'val') ?? '');
      if (!a) continue;
      const m = new Map<string, { fmt: string; text: string; start: number }>();
      for (const l of kids(a, 'lvl')) m.set(attr(l, 'ilvl') ?? '0', { fmt: attr(kids(l, 'numFmt')[0], 'val') ?? 'decimal', text: attr(kids(l, 'lvlText')[0], 'val') ?? '%1.', start: Number(attr(kids(l, 'start')[0], 'val') ?? 1) });
      levels.set(attr(n, 'numId') ?? '', m);
    }
  }
  // Lists made with a style (e.g. "List Number") keep their numbering in styles.xml.
  const styleNum = new Map<string, { numId: string; ilvl: number }>();
  if (zip['word/styles.xml']) {
    for (const st of kids(parse(strFromU8(zip['word/styles.xml'])), 'style')) {
      const np = kids(st, 'numPr')[0];
      const id = attr(kids(np ?? st, 'numId')[0], 'val');
      if (np && id) styleNum.set(attr(st, 'styleId') ?? '', { numId: id, ilvl: Number(attr(kids(np, 'ilvl')[0], 'val') ?? 0) });
    }
  }
  const counters = new Map<string, number[]>();
  const doc = parse(strFromU8(zip['word/document.xml']));
  const lines: string[] = [];
  for (const p of kids(doc, 'p')) {
    let text = '';
    for (const node of Array.from(p.getElementsByTagNameNS(W, '*'))) {
      if (node.localName === 't') text += node.textContent ?? '';
      else if (node.localName === 'tab') text += ' ';
      else if (node.localName === 'br') text += '\n';
    }
    const numPr = kids(p, 'numPr')[0];
    const fromStyle = styleNum.get(attr(kids(p, 'pStyle')[0], 'val') ?? '');
    const numId = numPr ? attr(kids(numPr, 'numId')[0], 'val') : fromStyle?.numId ?? null;
    if (numId && numId !== '0' && levels.has(numId) && text.trim()) {
      const ilvl = numPr ? Number(attr(kids(numPr, 'ilvl')[0], 'val') ?? fromStyle?.ilvl ?? 0) : fromStyle?.ilvl ?? 0;
      const lv = levels.get(numId)!;
      const c = counters.get(numId) ?? [];
      c[ilvl] = (c[ilvl] ?? (lv.get(String(ilvl))?.start ?? 1) - 1) + 1;
      c.length = ilvl + 1;
      counters.set(numId, c);
      const def = lv.get(String(ilvl));
      if (def && def.fmt !== 'bullet' && def.fmt !== 'none') {
        const label = def.text.replace(/%(\d)/g, (_, d) => { const i = Number(d) - 1; return fmt(c[i] ?? 1, lv.get(String(i))?.fmt ?? 'decimal'); });
        text = label + ' ' + text;
      }
    }
    lines.push(text);
  }
  return lines.join('\n');
}
