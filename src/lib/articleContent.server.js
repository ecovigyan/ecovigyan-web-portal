import sanitizeHtml from "sanitize-html";
import { normalizeArticleContent } from "@/lib/articleContent.shared";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "span",
  "blockquote",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "a",
];

const ALLOWED_ATTRIBUTES = {
  a: ["href", "target", "rel"],
  p: ["style"],
  span: ["style"],
  blockquote: ["style"],
  h1: ["style"],
  h2: ["style"],
  h3: ["style"],
  h4: ["style"],
  h5: ["style"],
  h6: ["style"],
  li: ["style"],
};

const COLOR_PATTERN =
  /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$|^rgb\((?:\s*\d{1,3}\s*,){2}\s*\d{1,3}\s*\)$|^[a-z]+$/i;

export function sanitizeArticleHtml(content = "") {
  const normalized = normalizeArticleContent(content);
  if (!normalized) return "";

  return sanitizeHtml(normalized, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ["http", "https", "mailto", "tel"],
    parseStyleAttributes: true,
    allowedStyles: {
      "*": {
        color: [COLOR_PATTERN],
        "background-color": [COLOR_PATTERN],
        "text-align": [/^(left|center|right|justify)$/],
        "font-style": [/^(normal|italic)$/],
        "font-weight": [/^(normal|bold|[1-9]00)$/],
        "text-decoration": [/^(none|underline|line-through|underline line-through)$/],
      },
      h1: {
        color: [COLOR_PATTERN],
        "text-align": [/^(left|center|right|justify)$/],
      },
      h2: {
        color: [COLOR_PATTERN],
        "text-align": [/^(left|center|right|justify)$/],
      },
      h3: {
        color: [COLOR_PATTERN],
        "text-align": [/^(left|center|right|justify)$/],
      },
      h4: {
        color: [COLOR_PATTERN],
        "text-align": [/^(left|center|right|justify)$/],
      },
      h5: {
        color: [COLOR_PATTERN],
        "text-align": [/^(left|center|right|justify)$/],
      },
      h6: {
        color: [COLOR_PATTERN],
        "text-align": [/^(left|center|right|justify)$/],
      },
      p: {
        color: [COLOR_PATTERN],
        "text-align": [/^(left|center|right|justify)$/],
      },
      span: {
        color: [COLOR_PATTERN],
        "background-color": [COLOR_PATTERN],
        "font-style": [/^(normal|italic)$/],
        "font-weight": [/^(normal|bold|[1-9]00)$/],
        "text-decoration": [/^(none|underline|line-through|underline line-through)$/],
      },
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform(
        "a",
        { target: "_blank", rel: "noopener noreferrer" },
        true
      ),
    },
  }).trim();
}
