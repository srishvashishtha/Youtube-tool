import type {
  DiscoveryResponse,
  Excerpt,
  Highlight,
  KeywordCheck,
  ScriptComment,
  ScriptDiffChunk,
  ScriptVersion,
  SeoCheck,
  Source,
  SourcePlatform,
  Topic,
} from "./types";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  createTopic: (data: { title?: string; seed_transcript?: string }) =>
    request<Topic>("/topics", { method: "POST", body: JSON.stringify(data) }),

  listTopics: () => request<Topic[]>("/topics"),

  getTopic: (id: number) => request<Topic>(`/topics/${id}`),

  runKeywordCheck: (topicId: number, keywords: string[]) =>
    request<KeywordCheck[]>(`/topics/${topicId}/keyword-checks`, {
      method: "POST",
      body: JSON.stringify({ keywords }),
    }),

  listKeywordChecks: (topicId: number) =>
    request<KeywordCheck[]>(`/topics/${topicId}/keyword-checks`),

  discoverSources: (topicId: number, keywords?: string[], platforms?: SourcePlatform[]) =>
    request<DiscoveryResponse>(`/topics/${topicId}/discover-sources`, {
      method: "POST",
      body: JSON.stringify({ keywords, platforms }),
    }),

  saveSource: (
    topicId: number,
    data: { url: string; platform: SourcePlatform; title?: string; author?: string }
  ) =>
    request<Source>(`/topics/${topicId}/sources`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  listSources: (topicId: number) => request<Source[]>(`/topics/${topicId}/sources`),

  listSourceExcerpts: (sourceId: number) =>
    request<Excerpt[]>(`/sources/${sourceId}/excerpts`),

  createHighlight: (
    topicId: number,
    data: { source_id: number; excerpt_id?: number; highlighted_text: string; note?: string }
  ) =>
    request<Highlight>(`/topics/${topicId}/highlights`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  listHighlights: (topicId: number) => request<Highlight[]>(`/topics/${topicId}/highlights`),

  deleteHighlight: (id: number) => request<void>(`/highlights/${id}`, { method: "DELETE" }),

  createScriptVersion: (topicId: number, content: string) =>
    request<ScriptVersion>(`/topics/${topicId}/scripts`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),

  listScriptVersions: (topicId: number) =>
    request<ScriptVersion[]>(`/topics/${topicId}/scripts`),

  getScriptDiff: (scriptId: number) =>
    request<{ isFirstVersion: boolean; chunks: ScriptDiffChunk[] }>(
      `/scripts/${scriptId}/diff`
    ),

  listScriptComments: (scriptId: number) =>
    request<ScriptComment[]>(`/scripts/${scriptId}/comments`),

  setCommentResolved: (id: number, resolved: boolean) =>
    request<ScriptComment>(`/script-comments/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ resolved }),
    }),

  runSeoCheck: (scriptId: number, keywords: string[]) =>
    request<SeoCheck[]>(`/scripts/${scriptId}/seo-checks`, {
      method: "POST",
      body: JSON.stringify({ keywords }),
    }),

  listSeoChecks: (scriptId: number) => request<SeoCheck[]>(`/scripts/${scriptId}/seo-checks`),
};
