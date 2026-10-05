import assert from "node:assert/strict";
import test from "node:test";
import { describeBoards, searchJobs } from "../src/search.js";
import { excerpt, matchesQuery } from "../src/text.js";

test("excerpt strips markup and keeps readable text", () => {
  assert.equal(excerpt("<p>Senior <b>Engineer</b>&amp; lead</p>"), "Senior Engineer & lead");
});

test("matchesQuery requires each keyword", () => {
  const job = { title: "Backend Engineer", company: "Acme", location: "Remote", excerpt: "Python APIs", tags: [] };
  assert.equal(matchesQuery(job, "python engineer"), true);
  assert.equal(matchesQuery(job, "python designer"), false);
});

test("list_boards names the popular boards and does not mark them searchable", () => {
  const boards = describeBoards();
  for (const id of ["linkedin", "indeed", "glassdoor", "ziprecruiter", "google_jobs", "monster", "wellfound"]) {
    const board = boards.find((item) => item.id === id);
    assert.ok(board, id);
    assert.equal(board.search, "no_public_api");
    assert.equal(board.configured, false);
  }
  assert.equal(boards.find((item) => item.id === "usajobs").search, "api_key");
  assert.equal(boards.find((item) => item.id === "remotive").configured, true);
});

test("searching Indeed does not fetch Indeed", async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(String(url));
    throw new Error(`unexpected fetch ${url}`);
  };
  const payload = await searchJobs({
    query: "nurse",
    boards: ["indeed", "linkedin", "glassdoor"],
    fetchImpl,
  });
  assert.deepEqual(calls, []);
  assert.equal(payload.results.length, 0);
  assert.equal(payload.boards.indeed.status, "unavailable");
  assert.match(payload.boards.indeed.error, /does not publish a job-seeker search API/);
  assert.equal(payload.boards.linkedin.status, "unavailable");
});

test("search filters a public feed down to the query", async () => {
  const fetchImpl = async (url) => {
    const href = String(url);
    if (href.includes("remotive.com")) {
      return jsonResponse({
        jobs: [
          {
            id: 1,
            title: "Python Engineer",
            company_name: "Northwind",
            candidate_required_location: "Worldwide",
            url: "https://remotive.com/remote-jobs/python-engineer",
            publication_date: "2026-10-01T00:00:00",
            salary: "$100k",
            tags: ["python"],
            description: "<p>Build APIs</p>",
          },
          {
            id: 2,
            title: "Copywriter",
            company_name: "Other",
            candidate_required_location: "USA",
            url: "https://remotive.com/remote-jobs/copywriter",
            description: "<p>Write ads</p>",
            tags: [],
          },
        ],
      });
    }
    if (href.includes("themuse.com")) {
      return jsonResponse({
        results: [
          {
            id: 9,
            name: "Platform Engineer",
            company: { name: "Starlink" },
            locations: [{ name: "Remote" }],
            refs: { landing_page: "https://www.themuse.com/jobs/example" },
            publication_date: "2026-10-01T00:00:00Z",
            contents: "<p>Software</p>",
            categories: [{ name: "Software Engineering" }],
          },
        ],
      });
    }
    return jsonResponse(href.includes("remoteok.com") ? [] : { jobs: [], data: [], results: [] });
  };

  const payload = await searchJobs({ query: "python engineer", limit: 5, fetchImpl });
  const titles = payload.results.map((job) => `${job.board}:${job.title}`);
  assert.deepEqual(titles.sort(), ["remotive:Python Engineer", "themuse:Platform Engineer"].sort());
  assert.equal(payload.boards.remotive.status, "ok");
  assert.equal(payload.boards.indeed, undefined);
});

test("USAJOBS and Adzuna parsers keep the board label", async () => {
  const previous = {
    USAJOBS_API_KEY: process.env.USAJOBS_API_KEY,
    USAJOBS_USER_EMAIL: process.env.USAJOBS_USER_EMAIL,
    ADZUNA_APP_ID: process.env.ADZUNA_APP_ID,
    ADZUNA_APP_KEY: process.env.ADZUNA_APP_KEY,
  };
  process.env.USAJOBS_API_KEY = "test-key";
  process.env.USAJOBS_USER_EMAIL = "tester@example.com";
  process.env.ADZUNA_APP_ID = "app";
  process.env.ADZUNA_APP_KEY = "secret-key";
  try {
    const fetchImpl = async (url, options = {}) => {
      const href = String(url);
      if (href.includes("usajobs.gov")) {
        assert.equal(href.includes("secret-key"), false);
        assert.equal(options.headers["Authorization-Key"], "test-key");
        return jsonResponse({
          SearchResult: {
            SearchResultItems: [
              {
                MatchedObjectId: "abc",
                MatchedObjectDescriptor: {
                  PositionTitle: "IT Specialist",
                  OrganizationName: "Department of Example",
                  PositionURI: "https://www.usajobs.gov/job/abc",
                  PositionLocationDisplay: "Washington, District of Columbia",
                  PublicationStartDate: "2026-10-01",
                  QualificationSummary: "<p>Public trust</p>",
                  PositionRemuneration: [{ MinimumRange: "80000", MaximumRange: "120000", CurrencyCode: "USD" }],
                },
              },
            ],
          },
        });
      }
      if (href.includes("adzuna.com")) {
        const parsed = new URL(href);
        assert.equal(parsed.searchParams.get("app_key"), "secret-key");
        return jsonResponse({
          results: [
            {
              id: "z1",
              title: "Python Engineer",
              redirect_url: "https://www.adzuna.com/land/z1",
              description: "Backend role",
              created: "2026-10-02T00:00:00Z",
              company: { display_name: "Example Co" },
              location: { display_name: "Austin, TX" },
              salary_min: 100000,
              salary_max: 140000,
            },
          ],
        });
      }
      throw new Error(`unexpected ${href}`);
    };

    const payload = await searchJobs({
      query: "python",
      boards: ["usajobs", "adzuna", "monster"],
      fetchImpl,
    });
    assert.deepEqual(
      payload.results.map((job) => job.board).sort(),
      ["adzuna", "usajobs"],
    );
    assert.equal(payload.boards.monster.status, "unavailable");
    assert.equal(payload.results.find((job) => job.board === "usajobs").company, "Department of Example");
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

function jsonResponse(body) {
  return {
    ok: true,
    status: 200,
    async json() {
      return body;
    },
  };
}
