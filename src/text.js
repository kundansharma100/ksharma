export function excerpt(html, max = 320) {
  const text = String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

export function queryTerms(query) {
  return String(query || "")
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((term) => term.length > 1);
}

export function matchesQuery(job, query) {
  const terms = queryTerms(query);
  if (terms.length === 0) return true;
  const haystack = [job.title, job.company, job.location, job.excerpt, ...(job.tags || [])]
    .join(" ")
    .toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

export function matchesLocation(job, location) {
  const wanted = String(location || "").trim().toLowerCase();
  if (!wanted) return true;
  const haystack = String(job.location || "").toLowerCase();
  const remoteQuery = /\b(remote|anywhere|worldwide)\b/.test(wanted);
  const remoteJob = job.remote === true || /\b(remote|worldwide|anywhere|global|flexible)\b/.test(haystack);
  if (remoteQuery) return haystack === "" || remoteJob;
  if (!haystack || remoteJob) return true;
  return wanted
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2)
    .some((term) => haystack.includes(term));
}

export function salaryRange(min, max, currency = "") {
  const hasMin = min !== undefined && min !== null && min !== "";
  const hasMax = max !== undefined && max !== null && max !== "";
  if (!hasMin && !hasMax) return undefined;
  const format = (value) => (typeof value === "number" ? value.toLocaleString("en-US") : String(value));
  const prefix = currency ? `${currency} ` : "";
  if (hasMin && hasMax) return `${prefix}${format(min)}–${format(max)}`;
  return `${prefix}${format(hasMin ? min : max)}`;
}

export function publicUrl(url) {
  const parsed = new URL(url);
  for (const key of ["app_id", "app_key", "api_key"]) parsed.searchParams.delete(key);
  return parsed.toString();
}
