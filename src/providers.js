import { getJson } from "./http.js";
import { excerpt, salaryRange } from "./text.js";

function job(fields) {
  return {
    tags: [],
    remote: false,
    ...fields,
    excerpt: fields.excerpt || "",
  };
}

const MUSE_CATEGORIES = [
  [/data scien|machine learning|\bml\b|analytics/, "Data and Analytics"],
  [/product manag/, "Product Management"],
  [/design|\bux\b|\bui\b/, "Design and UX"],
  [/nurse|health|clinical|medical/, "Healthcare"],
  [/sales|account executive/, "Sales"],
  [/market/, "Marketing"],
  [/software|developer|engineer|frontend|backend|full[- ]?stack|devops|\bsre\b|programmer/, "Software Engineering"],
];

export function museCategory(query) {
  const text = String(query || "").toLowerCase();
  for (const [pattern, category] of MUSE_CATEGORIES) {
    if (pattern.test(text)) return category;
  }
  return null;
}

export const providers = {
  async remotive({ fetchImpl, limit }) {
    const payload = await getJson("https://remotive.com/api/remote-jobs", { fetchImpl });
    return (payload.jobs || []).slice(0, 100).map((item) =>
      job({
        id: String(item.id),
        title: item.title || "",
        company: String(item.company_name || "").trim(),
        location: item.candidate_required_location || "Remote",
        url: item.url,
        board: "remotive",
        postedAt: item.publication_date,
        salary: item.salary || undefined,
        tags: item.tags || [],
        remote: true,
        excerpt: excerpt(item.description),
        prefiltered: false,
      }),
    ).slice(0, Math.max(limit * 5, limit));
  },

  async themuse({ query, fetchImpl, limit }) {
    const category = museCategory(query);
    if (!category) {
      return [];
    }
    const url = new URL("https://www.themuse.com/api/public/jobs");
    url.searchParams.set("page", "1");
    url.searchParams.set("category", category);
    const payload = await getJson(url, { fetchImpl });
    return (payload.results || []).slice(0, limit).map((item) =>
      job({
        id: String(item.id),
        title: item.name || "",
        company: item.company?.name || "",
        location: (item.locations || []).map((location) => location.name).filter(Boolean).join(", "),
        url: item.refs?.landing_page,
        board: "themuse",
        postedAt: item.publication_date,
        tags: (item.categories || []).map((category) => category.name).filter(Boolean),
        remote: (item.locations || []).some((location) => /remote|flexible/i.test(location.name || "")),
        excerpt: excerpt(item.contents),
        prefiltered: true,
      }),
    );
  },

  async remoteok({ fetchImpl, limit }) {
    const payload = await getJson("https://remoteok.com/api", { fetchImpl });
    const rows = Array.isArray(payload) ? payload : [];
    return rows
      .filter((item) => item && item.position && item.url)
      .slice(0, Math.max(limit * 8, 40))
      .map((item) =>
        job({
          id: String(item.id),
          title: item.position,
          company: item.company || "",
          location: item.location || "Remote",
          url: item.url,
          board: "remoteok",
          postedAt: item.date,
          salary: salaryRange(item.salary_min || undefined, item.salary_max || undefined, "USD"),
          tags: Array.isArray(item.tags) ? item.tags : [],
          remote: true,
          excerpt: excerpt(item.description),
          prefiltered: false,
        }),
      );
  },

  async jobicy({ fetchImpl, limit }) {
    const url = new URL("https://jobicy.com/api/v2/remote-jobs");
    url.searchParams.set("count", String(Math.min(Math.max(limit * 8, 20), 50)));
    const payload = await getJson(url, { fetchImpl });
    return (payload.jobs || []).map((item) =>
      job({
        id: String(item.id),
        title: item.jobTitle || "",
        company: item.companyName || "",
        location: item.jobGeo || "Remote",
        url: item.url,
        board: "jobicy",
        postedAt: item.pubDate,
        salary: salaryRange(item.salaryMin, item.salaryMax, item.salaryCurrency),
        tags: [...(item.jobIndustry || []), ...(item.jobType || [])],
        remote: true,
        excerpt: excerpt(item.jobExcerpt || item.jobDescription),
        prefiltered: false,
      }),
    );
  },

  async arbeitnow({ fetchImpl, limit }) {
    const payload = await getJson("https://www.arbeitnow.com/api/job-board-api", { fetchImpl });
    return (payload.data || []).slice(0, Math.max(limit * 10, 50)).map((item) =>
      job({
        id: item.slug,
        title: item.title || "",
        company: item.company_name || "",
        location: item.location || "",
        url: item.url,
        board: "arbeitnow",
        postedAt: item.created_at ? new Date(item.created_at * 1000).toISOString() : undefined,
        tags: [...(item.tags || []), ...(item.job_types || [])],
        remote: Boolean(item.remote),
        excerpt: excerpt(item.description),
        prefiltered: false,
      }),
    );
  },

  async usajobs({ query, location, fetchImpl, limit }) {
    const apiKey = process.env.USAJOBS_API_KEY;
    const email = process.env.USAJOBS_USER_EMAIL;
    if (!apiKey || !email) {
      throw new Error("Set USAJOBS_API_KEY and USAJOBS_USER_EMAIL to search USAJOBS.");
    }
    const url = new URL("https://data.usajobs.gov/api/search");
    url.searchParams.set("Keyword", query);
    url.searchParams.set("ResultsPerPage", String(limit));
    if (location && !/\bremote\b/i.test(location)) url.searchParams.set("LocationName", location);
    const payload = await getJson(url, {
      fetchImpl,
      headers: {
        "User-Agent": email,
        "Authorization-Key": apiKey,
      },
    });
    const items = payload.SearchResult?.SearchResultItems || [];
    return items.map((item) => {
      const descriptor = item.MatchedObjectDescriptor || {};
      const pay = descriptor.PositionRemuneration?.[0];
      return job({
        id: String(item.MatchedObjectId || descriptor.PositionID || descriptor.PositionURI),
        title: descriptor.PositionTitle || "",
        company: descriptor.OrganizationName || "U.S. Federal Government",
        location: descriptor.PositionLocationDisplay || "",
        url: descriptor.PositionURI,
        board: "usajobs",
        postedAt: descriptor.PublicationStartDate,
        salary: salaryRange(pay?.MinimumRange, pay?.MaximumRange, pay?.CurrencyCode || "USD"),
        remote: /remote/i.test(descriptor.PositionLocationDisplay || ""),
        excerpt: excerpt(descriptor.UserArea?.Details?.JobSummary || descriptor.QualificationSummary),
        prefiltered: true,
      });
    });
  },

  async adzuna({ query, location, fetchImpl, limit }) {
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;
    if (!appId || !appKey) {
      throw new Error("Set ADZUNA_APP_ID and ADZUNA_APP_KEY to search Adzuna.");
    }
    const country = process.env.ADZUNA_COUNTRY || "us";
    const url = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/1`);
    url.searchParams.set("app_id", appId);
    url.searchParams.set("app_key", appKey);
    url.searchParams.set("results_per_page", String(limit));
    url.searchParams.set("what", query);
    url.searchParams.set("content-type", "application/json");
    if (location && !/\bremote\b/i.test(location)) url.searchParams.set("where", location);
    const payload = await getJson(url, { fetchImpl });
    return (payload.results || []).map((item) =>
      job({
        id: String(item.id),
        title: item.title || "",
        company: item.company?.display_name || "",
        location: item.location?.display_name || "",
        url: item.redirect_url,
        board: "adzuna",
        postedAt: item.created,
        salary: salaryRange(item.salary_min, item.salary_max, item.salary_is_predicted === "1" ? undefined : "USD"),
        remote: /remote/i.test(`${item.title || ""} ${item.location?.display_name || ""}`),
        excerpt: excerpt(item.description),
        prefiltered: true,
      }),
    );
  },
};

export function isConfigured(boardId) {
  if (boardId === "usajobs") return Boolean(process.env.USAJOBS_API_KEY && process.env.USAJOBS_USER_EMAIL);
  if (boardId === "adzuna") return Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY);
  return false;
}
