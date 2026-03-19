import DOMPurify from "isomorphic-dompurify";

/** 
 * Safely render the custom header text with {{PUBLIC_URL}} replacement.
 * Prevents XSS and ensures a robust, clickable link.
 */
export function renderHeaderCustomText(html: string, publicUrl: string): string {
  // 1. Strict protocol check: only allow http(s) or relative URLs
  const isSafeProtocol = publicUrl.startsWith("http://") || 
                        publicUrl.startsWith("https://") || 
                        publicUrl.startsWith("/");
  
  if (!isSafeProtocol) {
    return DOMPurify.sanitize(html);
  }

  // 2. Use an extremely unique placeholder for sanitization
  const randomSuffix = Math.random().toString(36).slice(2, 10);
  const tempPlaceholder = `___PUBLIC_URL_LINK_${Date.now()}_${randomSuffix}___`;
  
  const withTemp = html.replace(/\{\{PUBLIC_URL\}\}/g, tempPlaceholder);

  // 3. Initial sanitization for user-provided HTML
  const sanitized = DOMPurify.sanitize(withTemp, {
    ALLOWED_TAGS: ["p", "br", "strong", "em", "s", "a", "span", "h1", "h2", "h3", "ul", "ol", "li", "u"],
    ALLOWED_ATTR: ["href", "target", "rel", "class", "style"],
    ADD_ATTR: ["target", "rel"],
  });

  // 4. Build a secure link. Escape href and text.
  // href: escape quotes, &, <, >
  const safeHref = publicUrl
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
    
  // text: escape < and >
  const safeText = publicUrl.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const finalPublicUrlLink = `<a href="${safeHref}" target="_blank" rel="noopener noreferrer" class="custom-header-link cursor-pointer relative z-[1] text-[color:var(--wsu-crimson)] underline hover:text-[color:var(--wsu-crimson-dark)]">${safeText}</a>`;

  // 5. Final replacement using a global regex to handle multiple occurrences
  return sanitized.replace(new RegExp(tempPlaceholder, "g"), finalPublicUrlLink);
}

/** 
 * Legacy text parsing for bold, italic, and URLs.
 * Used when the content is not HTML.
 */
export function parseFormattedHeaderText(text: string, publicUrl: string): Array<string | { t: "b" | "i" | "a"; c: string }> {
  const parts: Array<string | { t: "a"; c: string }> = [];
  const segments = text.split(/\{\{PUBLIC_URL\}\}/g);
  for (let i = 0; i < segments.length; i++) {
    parts.push(segments[i]!);
    if (i < segments.length - 1) {
      parts.push({ t: "a" as const, c: publicUrl });
    }
  }
  const result: Array<string | { t: "b" | "i" | "a"; c: string }> = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|(https?:\/\/[^\s<>"']+)/g;
  for (const part of parts) {
    if (typeof part === "object") {
      result.push(part);
      continue;
    }
    let lastEnd = 0;
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(part)) !== null) {
      if (m.index > lastEnd) result.push(part.slice(lastEnd, m.index));
      if (m[1] !== undefined) result.push({ t: "b" as const, c: m[1] });
      else if (m[2] !== undefined) result.push({ t: "i" as const, c: m[2] });
      else if (m[3] !== undefined) result.push({ t: "a" as const, c: m[3] });
      lastEnd = re.lastIndex;
    }
    if (lastEnd < part.length) result.push(part.slice(lastEnd));
  }
  return result;
}

/** 
 * Heuristic to detect if text is TipTap HTML content.
 */
export function isHtmlContent(text: string): boolean {
  const trimmed = text.trimStart();
  return (
    trimmed.startsWith("<p") || 
    trimmed.startsWith("<div") || 
    trimmed.startsWith("<span") || 
    trimmed.startsWith("<a") ||
    trimmed.startsWith("<strong") ||
    trimmed.startsWith("<em") ||
    trimmed.startsWith("<h1") ||
    trimmed.startsWith("<h2") ||
    trimmed.startsWith("<h3") ||
    trimmed.startsWith("<ul") ||
    trimmed.startsWith("<ol") ||
    trimmed.startsWith("<li") ||
    trimmed.startsWith("<u")
  );
}

/** 
 * DOMPurify hook to ensure all <a> tags are safe.
 */
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
    
    // Safety check: remove dangerous protocols in href
    const href = node.getAttribute("href") || "";
    if (href.toLowerCase().startsWith("javascript:") || 
        href.toLowerCase().startsWith("data:") || 
        href.toLowerCase().startsWith("vbscript:")) {
      node.removeAttribute("href");
    }
  }
});
