// YouTube search + transcript fetch via yt-dlp (tech-stack.md) — free,
// open-source, no API key, no billed quota. Never downloads video or audio;
// only the derived plain-text transcript is ever kept (small footprint).
//
// The binary is resolved to an absolute path rather than looked up on PATH —
// this repo has already hit PATH-resolution problems twice (the dev-server
// launcher, then Claude Code slash-command Bash calls), so this follows the
// same fix rather than hoping PATH is set correctly wherever this runs.

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";
import type { DiscoveryCandidate } from "./discovery.js";

const execFileAsync = promisify(execFile);
const MAX_BUFFER = 1024 * 1024 * 10;

const YTDLP_PATH = process.env.YTDLP_PATH ?? join(homedir(), "Library/Python/3.9/bin/yt-dlp");

export async function searchYoutube(
  keyword: string,
  limit = 8
): Promise<DiscoveryCandidate[]> {
  const { stdout } = await execFileAsync(
    YTDLP_PATH,
    [`ytsearch${limit}:${keyword}`, "--flat-playlist", "-j"],
    { maxBuffer: MAX_BUFFER }
  );

  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { id?: string; title?: string; channel?: string; uploader?: string })
    .filter((d): d is { id: string; title: string; channel?: string; uploader?: string } => !!d.id && !!d.title)
    .map((d) => ({
      url: `https://youtube.com/watch?v=${d.id}`,
      title: d.title,
      author: d.channel ?? d.uploader ?? null,
      platform: "youtube" as const,
    }));
}

export interface YoutubeTranscript {
  title: string | null;
  author: string | null;
  cleaned_text: string;
}

function parseSrtToText(srt: string): string {
  const lines = srt.split(/\r?\n/);
  const textLines: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (/^\d+$/.test(line)) continue; // cue index
    if (/^\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->/.test(line)) continue; // timestamp
    textLines.push(line.replace(/<[^>]+>/g, "")); // strip inline formatting tags
  }
  // Auto-generated captions repeat the same rolling line across consecutive
  // cues — collapse immediate repeats rather than keep duplicated text.
  const deduped: string[] = [];
  for (const line of textLines) {
    if (deduped[deduped.length - 1] !== line) deduped.push(line);
  }
  return deduped.join(" ").replace(/\s+/g, " ").trim();
}

export async function fetchYoutubeTranscript(videoUrl: string): Promise<YoutubeTranscript> {
  const { stdout: metaOut } = await execFileAsync(
    YTDLP_PATH,
    // Same player_client=android workaround as the subtitle fetch below —
    // the default client hits a live YouTube/yt-dlp streaming standoff (SABR)
    // even for metadata-only calls, verified directly against a real video.
    ["--extractor-args", "youtube:player_client=android", "--dump-json", "--skip-download", videoUrl],
    { maxBuffer: MAX_BUFFER }
  );
  const meta = JSON.parse(metaOut) as { title?: string; channel?: string; uploader?: string };

  const tmpDir = mkdtempSync(join(tmpdir(), "ytdlp-"));
  try {
    // player_client=android sidesteps a live YouTube/yt-dlp streaming-endpoint
    // standoff (SABR) that makes the plain --write-auto-sub recipe fail
    // outright — verified directly against a real video before adopting this.
    await execFileAsync(
      YTDLP_PATH,
      [
        "--extractor-args",
        "youtube:player_client=android",
        "--write-auto-subs",
        "--write-subs",
        "--sub-langs",
        "en.*",
        "--sub-format",
        "srt",
        "--skip-download",
        "-o",
        "%(id)s.%(ext)s",
        "--paths",
        tmpDir,
        videoUrl,
      ],
      { maxBuffer: MAX_BUFFER }
    );

    const srtFiles = readdirSync(tmpDir).filter((f) => f.endsWith(".srt"));
    if (srtFiles.length === 0) {
      throw new Error("No caption track available for this video — no transcript to extract");
    }
    const srt = readFileSync(join(tmpDir, srtFiles[0]), "utf-8");
    const cleaned_text = parseSrtToText(srt);
    if (!cleaned_text) {
      throw new Error("Caption track was empty after cleaning — no transcript to extract");
    }

    return {
      title: meta.title ?? null,
      author: meta.channel ?? meta.uploader ?? null,
      cleaned_text,
    };
  } finally {
    // No caption file, video, or audio is ever left on disk.
    rmSync(tmpDir, { recursive: true, force: true });
  }
}
