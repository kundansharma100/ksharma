import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

test("MCP client can list tools and search live public boards", { timeout: 60_000 }, async () => {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["src/index.js"],
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    stderr: "pipe",
  });
  const client = new Client({ name: "job-boards-test", version: "1.0.0" });
  await client.connect(transport);
  try {
    const listed = await client.listTools();
    const names = listed.tools.map((tool) => tool.name).sort();
    assert.deepEqual(names, ["list_boards", "search_jobs"]);

    const boardsResult = await client.callTool({ name: "list_boards", arguments: {} });
    const boards = JSON.parse(boardsResult.content[0].text);
    assert.ok(boards.boards.some((board) => board.id === "glassdoor" && board.search === "no_public_api"));

    const searchResult = await client.callTool({
      name: "search_jobs",
      arguments: { query: "developer", limit: 3, boards: ["remotive", "indeed"] },
    });
    const payload = JSON.parse(searchResult.content[0].text);
    assert.equal(payload.boards.indeed.status, "unavailable");
    assert.equal(payload.boards.remotive.status, "ok");
    assert.ok(payload.results.length > 0);
    for (const job of payload.results) {
      assert.equal(job.board, "remotive");
      assert.equal(typeof job.title, "string");
      assert.match(job.url, /^https:\/\//);
      assert.match(`${job.title} ${job.excerpt} ${(job.tags || []).join(" ")}`.toLowerCase(), /developer|dev/);
    }
  } finally {
    await client.close();
  }
});
