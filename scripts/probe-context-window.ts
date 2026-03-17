#!/usr/bin/env npx tsx
/**
 * Probe Kiro's actual context window by extracting contextUsagePercentage
 * from the binary AWS event-stream response.
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
  // Extract JSON objects embedded in binary event-stream frames
  const results: any[] = [];
  const jsonRegex = /\{[^{}]*\}/g;
  let match;
  while ((match = jsonRegex.exec(raw)) !== null) {
    try {
      results.push(JSON.parse(match[0]));
    } catch {}
  }
  return results;
}

async function sendRequest(
  accessToken: string,
  modelId: string,
  content: string,
): Promise<{ contextUsagePercentage: number | null; status: number; error?: string }> {
  const endpoint = "https://q.us-east-1.amazonaws.com/generateAssistantResponse";
  const mid = crypto.randomUUID().replace(/-/g, "");
  const ua = `aws-sdk-js/1.0.0 ua/2.1 os/nodejs lang/js api/codewhispererruntime#1.0.0 m/E KiroIDE-${mid}`;

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
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errText = await response.text();
    return { contextUsagePercentage: null, status: response.status, error: errText.slice(0, 300) };
  }

  const body = await response.text();
  const objects = extractJsonFromBinary(body);

  let contextUsagePercentage: number | null = null;
  for (const obj of objects) {
    if (typeof obj.contextUsagePercentage === "number") {
      contextUsagePercentage = obj.contextUsagePercentage;
    }
  }

  return { contextUsagePercentage, status: response.status };
}

async function main() {
  const accessToken = getAccessToken();
  console.log("Got access token\n");

  const sizes = [
    { chars: 50_000, label: "~12k tokens" },
    { chars: 200_000, label: "~50k tokens" },
    { chars: 400_000, label: "~100k tokens" },
    { chars: 600_000, label: "~150k tokens" },
  ];

  const models = [
    { id: "claude-opus-4.6", label: "Opus 4.6 (200k)", expectedWindow: 200_000 },
    { id: "claude-opus-4.6-1m", label: "Opus 4.6 (1M)", expectedWindow: 1_000_000 },
  ];

  console.log("Payload Size".padEnd(20), models.map(m => m.label.padEnd(35)).join(""));
  console.log("-".repeat(90));

  for (const size of sizes) {
    const padding = "The quick brown fox jumps over the lazy dog. ".repeat(Math.ceil(size.chars / 46));
    const content = `${padding.slice(0, size.chars)}\n\nRespond with exactly: "OK"`;
    const approxTokens = Math.round(content.length / 4);

    const row = [`~${approxTokens} tokens`.padEnd(20)];

    for (const model of models) {
      const result = await sendRequest(accessToken, model.id, content);
      if (result.error) {
        row.push(`ERR ${result.status}: ${result.error.slice(0, 25)}`.padEnd(35));
      } else {
        const pct = result.contextUsagePercentage;
        const impliedWindow = pct ? Math.round(approxTokens / (pct / 100)) : null;
        const impliedStr = impliedWindow ? `~${(impliedWindow / 1000).toFixed(0)}k` : "?";
        row.push(`${pct?.toFixed(2)}% (implied: ${impliedStr})`.padEnd(35));
      }
    }

    console.log(row.join(""));
  }
}

main().catch(console.error);
