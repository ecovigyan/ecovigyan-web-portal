const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;

const HTML_ENTITY_MAP = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

export function containsHtmlMarkup(content = "") {
  return HTML_TAG_PATTERN.test(content);
}

export function escapeHtml(content = "") {
  return content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function plainTextToHtml(content = "") {
  const trimmed = content.trim();
  if (!trimmed) return "";

  return trimmed
    .split(/\n\s*\n/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

export function normalizeArticleContent(content = "") {
  const trimmed = content.trim();
  if (!trimmed) return "";
  return containsHtmlMarkup(trimmed) ? trimmed : plainTextToHtml(trimmed);
}

export function decodeBasicHtmlEntities(content = "") {
  return content.replace(
    /&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;/g,
    (entity) => HTML_ENTITY_MAP[entity] || entity
  );
}

export function extractArticleText(content = "") {
  const normalized = normalizeArticleContent(content);

  return decodeBasicHtmlEntities(
    normalized
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|blockquote)>/gi, "\n")
      .replace(/<li[^>]*>/gi, "• ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function getArticleTextLength(content = "") {
  return extractArticleText(content).length;
}

export function truncateArticleText(content = "", maxLength = 250) {
  const text = extractArticleText(content);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}...`;
}
