#!/usr/bin/env npx tsx
/**
 * Binary search for Kiro's actual rejection threshold on 1M models.
 * Sends progressively larger payloads until we find the exact cutoff.
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

function getAccessToken(): string {
  const paths = [
    join(homedir(), ".local", "share", "kiro-cli", "data.sqlite3"),
    join(homedir(), "Library", "Application Support", "kiro-cli", "data.sqlite3"),
  ];
  for (const dbPath of paths) {
    if (!existsSync(dbPath)) continue;
    for (const key of ["kirocli:odic:token", "kirocli:social:token"]) {
      try {
        const result = execSync(
          `sqlite3 -json "${dbPath}" "SELECT value FROM auth_kv WHERE key = '${key}'"`,
          { encoding: "utf-8", timeout: 5000, stdio: ["pipe", "pipe", "pipe"] }
        ).trim();
        if (!result) continue;
        const rows = JSON.parse(result) as Array<{ value: string }>;
        if (!rows[0]?.value) continue;
        const tokenData = JSON.parse(rows[0].value);
        if (tokenData.access_token) return tokenData.access_token;
      } catch {}
    }
  }
  throw new Error("No valid kiro-cli credentials found");
}

function extractJsonFromBinary(raw: string): any[] {
  const results: any[] = [];
  const jsonRegex = /\{[^{}]*\}/g;
  let match;
  while ((match = jsonRegex.exec(raw)) !== null) {
    try { results.push(JSON.parse(match[0])); } catch {}
  }
  return results;
}

async function probe(
  accessToken: string,
  modelId: string,
  charCount: number,
): Promise<{ ok: boolean; status: number; contextPct: number | null; error?: string }> {
  const endpoint = "https://q.us-east-1.amazonaws.com/generateAssistantResponse";
  const mid = crypto.randomUUID().replace(/-/g, "");
  const ua = `aws-sdk-js/1.0.0 ua/2.1 os/nodejs lang/js api/codewhispererruntime#1.0.0 m/E KiroIDE-${mid}`;

  const padding = "The quick brown fox jumps over the lazy dog. ".repeat(Math.ceil(charCount / 46));
  const content = `${padding.slice(0, charCount)}\n\nRespond with exactly: "OK"`;

  const request = {
    conversationState: {
      chatTriggerType: "MANUAL",
      conversationId: crypto.randomUUID(),
      currentMessage: {
        userInputMessage: {
          content,
          modelId,
          origin: "AI_EDITOR",
        },
      },
    },
  };

  const bodyStr = JSON.stringify(request);
  const bodyBytes = Buffer.byteLength(bodyStr, "utf-8");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      "amz-sdk-invocation-id": crypto.randomUUID(),
      "amz-sdk-request": "attempt=1; max=1",
      "x-amzn-kiro-agent-mode": "vibe",
      "x-amz-user-agent": ua,
      "user-agent": ua,
      Connection: "close",
    },
    body: bodyStr,
  });

  if (!response.ok) {
    const errText = await response.text();
    return { ok: false, status: response.status, contextPct: null, error: errText.slice(0, 200) };
  }

  const body = await response.text();
  const objects = extractJsonFromBinary(body);
  let contextPct: number | null = null;
  for (const obj of objects) {
    if (typeof obj.contextUsagePercentage === "number") {
      contextPct = obj.contextUsagePercentage;
    }
  }

  return { ok: true, status: response.status, contextPct };
}

async function main() {
  const accessToken = getAccessToken();
  const modelId = "claude-opus-4.6-1m";
  console.log(`Probing rejection threshold for ${modelId}\n`);

  // Phase 1: Linear scan to find approximate boundary
  // Start at 200k chars (~50k tokens), step by 200k chars (~50k tokens)
  const steps = [
    200_000,    // ~50k tokens
    400_000,    // ~100k tokens
    600_000,    // ~150k tokens
    800_000,    // ~200k tokens
    1_000_000,  // ~250k tokens
    1_200_000,  // ~300k tokens
    1_600_000,  // ~400k tokens
    2_000_000,  // ~500k tokens
    2_400_000,  // ~600k tokens
    3_000_000,  // ~750k tokens
    3_600_000,  // ~900k tokens
    4_000_000,  // ~1M tokens
  ];

  console.log("chars".padEnd(14), "~tokens".padEnd(10), "status".padEnd(8), "contextPct".padEnd(14), "result");
  console.log("-".repeat(70));

  let lastOk = 0;
  let firstFail = 0;

  for (const chars of steps) {
    const approxTokens = Math.round(chars / 4);
    process.stdout.write(`${chars.toLocaleString().padEnd(14)}${(`~${(approxTokens/1000).toFixed(0)}k`).padEnd(10)}`);

    const result = await probe(accessToken, modelId, chars);

    if (result.ok) {
      lastOk = chars;
      console.log(`${result.status.toString().padEnd(8)}${(result.contextPct?.toFixed(2) + "%").padEnd(14)}✅ OK`);
    } else {
      firstFail = chars;
      console.log(`${result.status.toString().padEnd(8)}${"—".padEnd(14)}❌ ${result.error?.slice(0, 60)}`);
      break;
    }
  }

  if (firstFail === 0) {
    console.log("\n🎉 All probes succeeded — no rejection found up to 4M chars (~1M tokens)");
    return;
  }

  // Phase 2: Binary search between lastOk and firstFail
  console.log(`\nBinary search between ${lastOk.toLocaleString()} and ${firstFail.toLocaleString()} chars...`);
  console.log("-".repeat(70));

  let lo = lastOk;
  let hi = firstFail;

  while (hi - lo > 50_000) { // ~12.5k token precision
    const mid = Math.floor((lo + hi) / 2);
    const approxTokens = Math.round(mid / 4);
    process.stdout.write(`${mid.toLocaleString().padEnd(14)}${(`~${(approxTokens/1000).toFixed(0)}k`).padEnd(10)}`);

    const result = await probe(accessToken, modelId, mid);

    if (result.ok) {
      lo = mid;
      console.log(`${result.status.toString().padEnd(8)}${(result.contextPct?.toFixed(2) + "%").padEnd(14)}✅ OK`);
    } else {
      hi = mid;
      console.log(`${result.status.toString().padEnd(8)}${"—".padEnd(14)}❌ REJECTED`);
    }
  }

  const thresholdChars = lo;
  const thresholdTokens = Math.round(lo / 4);
  console.log(`\n${"=".repeat(70)}`);
  console.log(`Rejection threshold: ~${thresholdChars.toLocaleString()} chars (~${(thresholdTokens/1000).toFixed(0)}k tokens)`);
  console.log(`As % of 1M context: ~${(thresholdTokens / 10000).toFixed(1)}%`);
  console.log(`${"=".repeat(70)}`);
}

main().catch(console.error);
