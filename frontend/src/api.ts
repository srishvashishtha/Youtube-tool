import type { KeywordCheck, Topic } from "./types";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: HTTP ${res.status}`);
  }
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
};
