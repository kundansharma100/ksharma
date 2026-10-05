export const POPULAR_BOARDS = [
  {
    id: "linkedin",
    name: "LinkedIn",
    search: "no_public_api",
    why: "Best overall board for professional roles, with the widest recruiter reach.",
  },
  {
    id: "indeed",
    name: "Indeed",
    search: "no_public_api",
    why: "Largest general job inventory, especially for hourly and non-tech roles.",
  },
  {
    id: "glassdoor",
    name: "Glassdoor",
    search: "no_public_api",
    why: "Strongest major board for salaries, reviews, and interview reports before you apply.",
  },
  {
    id: "ziprecruiter",
    name: "ZipRecruiter",
    search: "no_public_api",
    why: "Large U.S. audience. One employer post is distributed across many other boards.",
  },
  {
    id: "google_jobs",
    name: "Google for Jobs",
    search: "no_public_api",
    why: "Highest measured response rate among major search surfaces because listings come from employer career sites.",
  },
  {
    id: "monster",
    name: "Monster",
    search: "no_public_api",
    why: "Still one of the highest-traffic general job boards.",
  },
  {
    id: "wellfound",
    name: "Wellfound",
    search: "no_public_api",
    why: "Most effective widely used board for startup roles.",
  },
  {
    id: "usajobs",
    name: "USAJOBS",
    search: "api_key",
    why: "The board that matters for U.S. federal jobs, and it has an official search API.",
  },
];

export const PUBLIC_API_BOARDS = [
  {
    id: "remotive",
    name: "Remotive",
    search: "public_api",
    why: "Remote roles with a documented public JSON API.",
  },
  {
    id: "themuse",
    name: "The Muse",
    search: "public_api",
    why: "Employer-posted roles with a documented public API and category search.",
  },
  {
    id: "remoteok",
    name: "Remote OK",
    search: "public_api",
    why: "Remote listings with a documented public JSON feed.",
  },
  {
    id: "jobicy",
    name: "Jobicy",
    search: "public_api",
    why: "Remote listings with a documented public API.",
  },
  {
    id: "arbeitnow",
    name: "Arbeitnow",
    search: "public_api",
    why: "European listings with a documented public API.",
  },
  {
    id: "adzuna",
    name: "Adzuna",
    search: "api_key",
    why: "Official multi-country job search API. Results stay labeled Adzuna rather than as LinkedIn or Indeed.",
  },
];

const BY_ID = new Map([...POPULAR_BOARDS, ...PUBLIC_API_BOARDS].map((board) => [board.id, board]));

export function allBoards() {
  return [...BY_ID.values()];
}

export function boardById(id) {
  return BY_ID.get(id);
}
