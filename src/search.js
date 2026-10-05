import { allBoards, boardById } from "./catalog.js";
import { isConfigured, providers } from "./providers.js";
import { matchesLocation, matchesQuery } from "./text.js";

const NO_PUBLIC_API =
  "This board does not publish a job-seeker search API. This server does not scrape it.";

export function describeBoards() {
  return allBoards().map((board) => ({
    id: board.id,
    name: board.name,
    why: board.why,
    search: board.search,
    configured: board.search === "api_key" ? isConfigured(board.id) : board.search === "public_api",
  }));
}

function unavailableReason(board) {
  if (board.search === "no_public_api") return NO_PUBLIC_API;
  if (board.search === "api_key" && !isConfigured(board.id)) {
    if (board.id === "usajobs") return "Set USAJOBS_API_KEY and USAJOBS_USER_EMAIL to search USAJOBS.";
    if (board.id === "adzuna") return "Set ADZUNA_APP_ID and ADZUNA_APP_KEY to search Adzuna.";
  }
  return "This board is not searchable.";
}

export function selectBoards(requested) {
  if (!requested || requested.length === 0) {
    return {
      selected: allBoards().filter((board) => board.search === "public_api" || (board.search === "api_key" && isConfigured(board.id))),
      unknown: [],
    };
  }
  const selected = [];
  const unknown = [];
  for (const id of requested) {
    const board = boardById(id);
    if (!board) unknown.push(id);
    else selected.push(board);
  }
  return { selected, unknown };
}

function keep(job, query, location) {
  if (!job.url || !job.title) return false;
  if (!job.prefiltered && !matchesQuery(job, query)) return false;
  return matchesLocation(job, location);
}

export async function searchJobs({ query, location, boards, limit = 5, fetchImpl = fetch } = {}) {
  const perBoard = Math.min(Math.max(Number(limit) || 5, 1), 20);
  const { selected, unknown } = selectBoards(boards);
  const boardStatus = {};
  for (const id of unknown) boardStatus[id] = { status: "unknown", error: `Unknown board id: ${id}` };

  const results = [];
  await Promise.all(
    selected.map(async (board) => {
      const provider = providers[board.id];
      if (!provider || board.search === "no_public_api" || (board.search === "api_key" && !isConfigured(board.id))) {
        boardStatus[board.id] = { status: "unavailable", error: unavailableReason(board), count: 0 };
        return;
      }
      try {
        const jobs = await provider({ query, location, limit: perBoard, fetchImpl });
        const matched = jobs.filter((item) => keep(item, query, location)).slice(0, perBoard);
        boardStatus[board.id] = { status: "ok", count: matched.length };
        for (const item of matched) {
          const { prefiltered, tags, remote, ...publicJob } = item;
          results.push(publicJob);
        }
      } catch (error) {
        boardStatus[board.id] = {
          status: "error",
          error: error instanceof Error ? error.message : "Search failed",
          count: 0,
        };
      }
    }),
  );

  return {
    query,
    location: location || null,
    results,
    boards: boardStatus,
  };
}
