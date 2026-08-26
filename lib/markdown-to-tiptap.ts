type TiptapMark = { type: "bold" | "italic" };
type TiptapTextNode = { type: "text"; text: string; marks?: TiptapMark[] };
type TiptapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: (TiptapNode | TiptapTextNode)[];
};

const INLINE_PATTERN = /(\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_)/;

function parseInline(text: string): TiptapTextNode[] {
  if (!text) return [];

  const nodes: TiptapTextNode[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    const match = remaining.match(INLINE_PATTERN);
    if (!match || match.index === undefined) {
      nodes.push({ type: "text", text: remaining });
      break;
    }

    if (match.index > 0) {
      nodes.push({ type: "text", text: remaining.slice(0, match.index) });
    }

    if (match[2] !== undefined) {
      nodes.push({ type: "text", text: match[2], marks: [{ type: "bold" }] });
    } else {
      const italicText = match[3] ?? match[4] ?? "";
      nodes.push({ type: "text", text: italicText, marks: [{ type: "italic" }] });
    }

    remaining = remaining.slice(match.index + match[0].length);
  }

  return nodes;
}

function parseMarkdownBlocks(text: string): TiptapNode[] {
  const lines = text.split("\n");
  const nodes: TiptapNode[] = [];
  let i = 0;

  const isHeading = (line: string) => /^(#{1,2})\s+(.*)$/.test(line);
  const isBullet = (line: string) => /^[-*]\s+(.*)$/.test(line);
  const isOrdered = (line: string) => /^\d+\.\s+(.*)$/.test(line);

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    const headingMatch = line.match(/^(#{1,2})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2;
      nodes.push({
        type: "heading",
        attrs: { level },
        content: parseInline(headingMatch[2]),
      });
      i++;
      continue;
    }

    if (isBullet(line)) {
      const items: string[] = [];
      while (i < lines.length && isBullet(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }
      nodes.push({
        type: "bulletList",
        content: items.map((item) => ({
          type: "listItem",
          content: [{ type: "paragraph", content: parseInline(item) }],
        })),
      });
      continue;
    }

    if (isOrdered(line)) {
      const items: string[] = [];
      while (i < lines.length && isOrdered(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      nodes.push({
        type: "orderedList",
        content: items.map((item) => ({
          type: "listItem",
          content: [{ type: "paragraph", content: parseInline(item) }],
        })),
      });
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !isHeading(lines[i]) &&
      !isBullet(lines[i]) &&
      !isOrdered(lines[i])
    ) {
      paragraphLines.push(lines[i]);
      i++;
    }
    nodes.push({ type: "paragraph", content: parseInline(paragraphLines.join(" ")) });
  }

  return nodes;
}

function parsePlainText(text: string): TiptapNode[] {
  return text
    .split(/\n{2,}/)
    .map((block) => block.replace(/\n/g, " ").trim())
    .filter((block) => block.length > 0)
    .map((block) => ({ type: "paragraph", content: parseInline(block) }));
}

export function convertToTiptapDoc(raw: string, format: "text" | "markdown"): TiptapNode {
  const normalized = raw.replace(/\r\n/g, "\n").trim();

  if (!normalized) {
    return { type: "doc", content: [{ type: "paragraph" }] };
  }

  const content = format === "markdown" ? parseMarkdownBlocks(normalized) : parsePlainText(normalized);

  return { type: "doc", content: content.length > 0 ? content : [{ type: "paragraph" }] };
}
