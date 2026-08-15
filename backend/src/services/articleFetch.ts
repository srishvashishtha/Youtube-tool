// Fetches an article URL and extracts clean, readable text only — this is
// the "no raw HTML dumps, cleaned text only" rule (CLAUDE.md) enforced in
// code, not just by convention. Uses Readability (the same extraction
// Firefox Reader View runs) against a throwaway jsdom document; the raw HTML
// and the DOM are both local to this function and never touch the DB or disk.

import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

export interface CleanedArticle {
  title: string | null;
  author: string | null;
  cleaned_text: string;
}

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export async function fetchAndCleanArticle(url: string): Promise<CleanedArticle> {
  const res = await fetch(url, { headers: { "User-Agent": BROWSER_UA } });
  if (!res.ok) {
    throw new Error(`Fetch failed: HTTP ${res.status} for ${url}`);
  }
  const html = await res.text();

  // Default jsdom config: no external resource loading, no script execution —
  // this only ever parses the HTML text already fetched above.
  // jsdom holds a full DOM plus timers per instance and does NOT free them on
  // its own — without the window.close() below, fetching several articles in a
  // row leaks each DOM until GC runs under pressure, which trips a native
  // finalizer crash and takes the whole server down. Parse, copy the strings
  // out, close, then work only with the copies.
  const dom = new JSDOM(html, { url });
  let article: ReturnType<Readability["parse"]>;
  try {
    article = new Readability(dom.window.document).parse();
    article = article && {
      ...article,
      title: String(article.title ?? ""),
      byline: String(article.byline ?? ""),
      textContent: String(article.textContent ?? ""),
    };
  } finally {
    dom.window.close();
  }

  if (!article?.textContent || article.textContent.trim().length < 50) {
    // Paywalled, JS-rendered, or genuinely empty — refuse rather than save
    // something unusable. The caller (routes/sources.ts) treats this as a
    // real failure to surface, never a reason to fabricate a substitute.
    throw new Error(
      "Could not extract readable article text (paywalled, JS-rendered, or empty page)"
    );
  }

  //   (nbsp) and friends survive Readability and are invisible in the UI,
  // but they are NOT the space character a person types or pastes. Left in,
  // they silently fail the substring check that guards against fabricated
  // excerpts — rejecting real quotes as fake. Fold them to plain spaces first.
  const cleaned_text = article.textContent
    .replace(/[   ​﻿]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    title: article.title || null,
    author: article.byline || null,
    cleaned_text,
  };
}
