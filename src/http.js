import { publicUrl } from "./text.js";

const USER_AGENT = "ksharma-job-boards-mcp/1.0";

export async function getJson(url, { fetchImpl = fetch, headers = {}, timeoutMs = 15000 } = {}) {
  const response = await fetchImpl(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
      ...headers,
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${publicUrl(url)}`);
  }
  return response.json();
}
