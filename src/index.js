import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { describeBoards, searchJobs } from "./search.js";

const server = new McpServer({
  name: "job-boards",
  version: "1.0.0",
});

server.registerTool(
  "list_boards",
  {
    title: "List job boards",
    description:
      "List the job boards this server knows. Popular boards without a public job-seeker API are included so you can see why they are not searched. Call this before search_jobs.",
    inputSchema: {},
  },
  async () => ({
    content: [{ type: "text", text: JSON.stringify({ boards: describeBoards() }, null, 2) }],
  }),
);

server.registerTool(
  "search_jobs",
  {
    title: "Search job boards",
    description:
      "Search job boards that expose a documented public API. Omit boards to search every configured public source. LinkedIn, Indeed, Glassdoor, ZipRecruiter, Google for Jobs, Monster, and Wellfound are recognized but not scraped.",
    inputSchema: {
      query: z.string().min(1).describe("Role or keywords, for example software engineer"),
      location: z.string().optional().describe("City, region, or remote"),
      boards: z
        .array(z.string())
        .optional()
        .describe("Board ids from list_boards. Omit to search every live public source."),
      limit: z.number().int().min(1).max(20).optional().describe("Maximum results per board. Default 5."),
    },
  },
  async ({ query, location, boards, limit }) => {
    const payload = await searchJobs({ query, location, boards, limit });
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
