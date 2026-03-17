#!/usr/bin/env npx tsx
/**
 * Quick test: does the new user-agent bypass the 198 message limit?
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

function makeHistory(msgCount: number) {
  const history: any[] = [];
  for (let i = 0; i < msgCount; i++) {
    if (i % 2 === 0) {
      history.push({
        userInputMessage: {
          content: `Message ${i}: hello`,
          userInputMessageContext: { editorState: { cursorState: { range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } } } } },
        },
      });
    } else {
      history.push({
        assistantResponseMessage: { content: `Response ${i}: hi` },
      });
    }
  }
  return history;
}

async function probe(accessToken: string, msgCount: number, ua: string, label: string) {
  const endpoint = "https://q.us-east-1.amazonaws.com/generateAssistantResponse";
  const history = makeHistory(msgCount);
  const request = {
    conversationState: {
      chatTriggerType: "MANUAL",
      conversationId: crypto.randomUUID(),
      currentMessage: {
        userInputMessage: { content: 'Say "OK"', modelId: "claude-opus-4.6-1m", origin: "AI_EDITOR" },
      },
      history,
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

  const status = response.ok ? "✅" : "❌";
  const errText = response.ok ? "" : ` — ${(await response.text()).slice(0, 80)}`;
  if (response.ok) await response.text();
  console.log(`${label.padEnd(50)} ${msgCount} msgs  ${status}${errText}`);
}

async function main() {
  const accessToken = getAccessToken();
  const mid = crypto.randomUUID().replace(/-/g, "");

  const oldUA = `aws-sdk-js/1.0.0 ua/2.1 os/nodejs lang/js api/codewhispererruntime#1.0.0 m/E KiroIDE-${mid}`;
  const newUA = `aws-sdk-js/1.0.0 ua/2.1 os/nodejs lang/js api/codewhispererruntime#1.0.0 m/E KiroIDE-0.75.0-${mid}`;

  console.log("Testing message limit with old vs new user-agent\n");

  // 200 messages — should fail with old UA, succeed with new
  await probe(accessToken, 200, oldUA, "OLD UA (no version) KiroIDE-<uuid>");
  await probe(accessToken, 200, newUA, "NEW UA (0.75.0)     KiroIDE-0.75.0-<uuid>");

  // 400 messages — should succeed with new UA
  await probe(accessToken, 400, newUA, "NEW UA (0.75.0)     KiroIDE-0.75.0-<uuid>");

  // 500 messages
  await probe(accessToken, 500, newUA, "NEW UA (0.75.0)     KiroIDE-0.75.0-<uuid>");
}

main().catch(console.error);
