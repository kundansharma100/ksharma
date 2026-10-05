# ksharma

MCP server that searches job boards through documented public APIs.

## Boards

Popular boards recognized by the server:

| Board | Why it is included | Search from this server |
| --- | --- | --- |
| LinkedIn | Best overall professional board and recruiter reach | No public job-seeker API |
| Indeed | Largest general inventory | No public job-seeker API |
| Glassdoor | Salaries, reviews, and interview reports | No public job-seeker API |
| ZipRecruiter | Large U.S. audience and cross-board distribution | No public job-seeker API |
| Google for Jobs | Highest response rate among major search surfaces | No public job-seeker API |
| Monster | High-traffic general board | No public job-seeker API |
| Wellfound | Startup roles | No public job-seeker API |
| USAJOBS | U.S. federal jobs | Official API when `USAJOBS_API_KEY` and `USAJOBS_USER_EMAIL` are set |

The server searches these public APIs today: Remotive, The Muse, Remote OK, Jobicy, and Arbeitnow. Adzuna is included when `ADZUNA_APP_ID` and `ADZUNA_APP_KEY` are set. Results keep the source board name and listing URL.

## Tools

- `list_boards` lists every board and whether it can be searched.
- `search_jobs` searches live sources. Arguments: `query`, optional `location`, optional `boards`, optional `limit` (1–20 per board, default 5).

## Run

```bash
npm ci
npm test
npm start
```

Cursor loads the server from `.cursor/mcp.json`. Start it from the repository root so `node src/index.js` resolves.

Optional keys:

- USAJOBS: request a key at https://developer.usajobs.gov/apirequest and set `USAJOBS_USER_EMAIL` to the same email address.
- Adzuna: create an app at https://developer.adzuna.com/ and set `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, and optionally `ADZUNA_COUNTRY` (default `us`).
