#!/usr/bin/env npx tsx
/**
 * Dump raw Kiro API response to see what fields come back.
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

async function main() {
  const accessToken = getAccessToken();
  const endpoint = "https://q.us-east-1.amazonaws.com/generateAssistantResponse";
  const mid = crypto.randomUUID().replace(/-/g, "");
  const ua = `aws-sdk-js/1.0.0 ua/2.1 os/nodejs lang/js api/codewhispererruntime#1.0.0 m/E KiroIDE-${mid}`;

  // Small payload, just to see the response shape
  const request = {
    conversationState: {
      chatTriggerType: "MANUAL",
      conversationId: crypto.randomUUID(),
      currentMessage: {
        userInputMessage: {
          content: "Say exactly: HELLO",
          modelId: "claude-opus-4.6-1m",
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

  console.log(`Status: ${response.status}`);
  console.log(`Headers:`, Object.fromEntries(response.headers.entries()));
  console.log(`\n--- Raw body ---`);
  const body = await response.text();
  console.log(body.slice(0, 3000));
  
  console.log(`\n--- Parsed lines ---`);
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed);
      console.log(JSON.stringify(obj, null, 2).slice(0, 500));
    } catch {
      console.log(`[non-JSON]: ${trimmed.slice(0, 200)}`);
    }
  }
}

main().catch(console.error);
