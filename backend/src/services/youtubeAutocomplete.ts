// Free, unofficial, no API key. See docs/tech-stack.md — Stage 1.
// Real signal only: whatever this endpoint actually returns is what gets stored.
// Nothing here is invented if the endpoint returns nothing.

export interface AutocompleteResult {
  keyword: string;
  suggestions: string[];
}

export async function fetchYoutubeAutocomplete(
  keyword: string
): Promise<AutocompleteResult> {
  const url = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(
    keyword
  )}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (research-script-assistant/0.1)" },
  });

  if (!res.ok) {
    throw new Error(`YouTube autocomplete request failed: HTTP ${res.status}`);
  }

  const text = await res.text();
  // Response shape (client=firefox): [query, [suggestion, ...], [], {...}]
  const parsed = JSON.parse(text) as [string, string[], unknown, unknown];
  const suggestions = Array.isArray(parsed[1]) ? parsed[1] : [];

  return { keyword, suggestions };
}
