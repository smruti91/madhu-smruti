import sanitizeHtml from "sanitize-html";

/**
 * HTML sanitizer for writeup content.
 *
 * The editor (Tiptap) generates the HTML on the client, but anything arriving
 * over the network is untrusted — sanitize before it is stored so the
 * sanitized snapshot is safe for preview and administrative review.
 *
 * Allowed: the Tiptap document vocabulary (headings, lists, blockquote,
 * links, hard breaks, code) plus the editor image figure node and inline
 * text-style spans (color / font-size).
 */

const ALIGN_VALUE_PATTERN = /^(left|center|right|justify)$/;

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "strong", "em", "u", "s", "code", "span",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li",
    "blockquote",
    "a",
    "figure", "figcaption", "img",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "style"],
    figure: ["class", "style"],
    figcaption: ["class"],
    span: ["style"],
    p: ["style", "class"],
  },
  allowedStyles: {
    "*": {
      "text-align": [ALIGN_VALUE_PATTERN],
      color: [/^#[0-9a-fA-F]{3,8}$/, /^rgb\(\s*\d{1,3},\s*\d{1,3},\s*\d{1,3}\)$/],
      "font-size": [/^\d+(\.\d+)?(px|rem|em|%)$/],
    },
    img: {
      width: [/^\d{1,3}%$/],
      float: [/^(left|right|none)$/],
      "margin-left": [/^auto$/, /^0$/, /^\d+(\.\d+)?(px|rem|em|%)$/],
      "margin-right": [/^auto$/, /^0$/, /^\d+(\.\d+)?(px|rem|em|%)$/],
    },
    figure: {
      "margin-left": [/^auto$/, /^0$/, /^\d+(\.\d+)?(px|rem|em|%)$/],
      "margin-right": [/^auto$/, /^0$/, /^\d+(\.\d+)?(px|rem|em|%)$/],
      width: [/^\d{1,3}%$/],
      float: [/^(left|right|none)$/],
    },
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowProtocolRelative: false,
};

/** Transforms a class like "text-center" into an inline style for storage. */
export function sanitizeWriteupHtml(html: string): string {
  return sanitizeHtml(html, sanitizeOptions);
}
