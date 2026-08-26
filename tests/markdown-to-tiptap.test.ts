import { describe, expect, it } from "vitest";
import { convertToTiptapDoc } from "../lib/markdown-to-tiptap";

describe("convertToTiptapDoc", () => {
  it("converts plain text into paragraphs split on blank lines", () => {
    const result = convertToTiptapDoc("First paragraph.\n\nSecond paragraph.", "text");
    expect(result).toEqual({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "First paragraph." }] },
        { type: "paragraph", content: [{ type: "text", text: "Second paragraph." }] },
      ],
    });
  });

  it("converts markdown headings", () => {
    const result = convertToTiptapDoc("# Title\n\n## Subtitle", "markdown");
    expect(result.content).toEqual([
      { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Title" }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Subtitle" }] },
    ]);
  });

  it("converts bold and italic inline marks", () => {
    const result = convertToTiptapDoc("This is **bold** and this is *italic*.", "markdown");
    expect(result.content).toEqual([
      {
        type: "paragraph",
        content: [
          { type: "text", text: "This is " },
          { type: "text", text: "bold", marks: [{ type: "bold" }] },
          { type: "text", text: " and this is " },
          { type: "text", text: "italic", marks: [{ type: "italic" }] },
          { type: "text", text: "." },
        ],
      },
    ]);
  });

  it("converts bullet and numbered lists", () => {
    const result = convertToTiptapDoc("- one\n- two\n\n1. first\n2. second", "markdown");
    expect(result.content).toEqual([
      {
        type: "bulletList",
        content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "one" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "two" }] }] },
        ],
      },
      {
        type: "orderedList",
        content: [
          {
            type: "listItem",
            content: [{ type: "paragraph", content: [{ type: "text", text: "first" }] }],
          },
          {
            type: "listItem",
            content: [{ type: "paragraph", content: [{ type: "text", text: "second" }] }],
          },
        ],
      },
    ]);
  });

  it("returns a minimal empty doc for blank input", () => {
    expect(convertToTiptapDoc("", "text")).toEqual({
      type: "doc",
      content: [{ type: "paragraph" }],
    });
    expect(convertToTiptapDoc("   \n\n  ", "markdown")).toEqual({
      type: "doc",
      content: [{ type: "paragraph" }],
    });
  });
});
