#!/usr/bin/env npx tsx
/**
 * Probe with realistic pi-style history (alternating messages + tool calls)
 * to find what triggers "Input is too long" on 1M models.
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

function makeHistory(turnCount: number, charsPerTurn: number) {
  const history: any[] = [];
  const padding = "x".repeat(charsPerTurn);

  for (let i = 0; i < turnCount; i++) {
    // User message
    history.push({
      userInputMessage: {
        content: `Turn ${i}: ${padding}`,
        userInputMessageContext: { editorState: { cursorState: { range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } } } } },
      },
    });
    // Assistant response
    history.push({
      assistantResponseMessage: {
        content: `Response ${i}: ${padding}`,
      },
    });
  }
  return history;
}

function makeHistoryWithTools(turnCount: number, charsPerTurn: number) {
  const history: any[] = [];
  const padding = "x".repeat(charsPerTurn);

  for (let i = 0; i < turnCount; i++) {
    // User message
    history.push({
      userInputMessage: {
        content: `Turn ${i}: ${padding}`,
        userInputMessageContext: { editorState: { cursorState: { range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } } } } },
      },
    });
    // Assistant with tool use
    history.push({
      assistantResponseMessage: {
        content: `Let me check that. ${padding.slice(0, charsPerTurn / 4)}`,
      },
    });
    // Tool result wrapped in user message (Kiro format)
    history.push({
      userInputMessage: {
        content: `Tool result: ${padding}`,
        userInputMessageContext: { editorState: { cursorState: { range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } } } } },
      },
    });
    // Final assistant response
    history.push({
      assistantResponseMessage: {
        content: `Based on the result: ${padding.slice(0, charsPerTurn / 4)}`,
      },
    });
  }
  return history;
}

async function probe(
  accessToken: string,
  modelId: string,
  history: any[],
  systemPrompt: string,
  label: string,
): Promise<void> {
  const endpoint = "https://q.us-east-1.amazonaws.com/generateAssistantResponse";
  const mid = crypto.randomUUID().replace(/-/g, "");
  const ua = `aws-sdk-js/1.0.0 ua/2.1 os/nodejs lang/js api/codewhispererruntime#1.0.0 m/E KiroIDE-${mid}`;

  const request: any = {
    conversationState: {
      chatTriggerType: "MANUAL",
      conversationId: crypto.randomUUID(),
      currentMessage: {
        userInputMessage: {
          content: 'Say "OK"',
          modelId,
          origin: "AI_EDITOR",
        },
      },
      ...(history.length > 0 ? { history } : {}),
      ...(systemPrompt ? { customizationArn: "", systemPrompt } : {}),
    },
  };

  const bodyStr = JSON.stringify(request);
  const bodyBytes = Buffer.byteLength(bodyStr, "utf-8");
  const historyChars = JSON.stringify(history).length;

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

  const bodyMB = (bodyBytes / 1024 / 1024).toFixed(2);
  const historyMB = (historyChars / 1024 / 1024).toFixed(2);
  const msgCount = history.length;

  if (response.ok) {
    const body = await response.text();
    const objects = extractJsonFromBinary(body);
    let pct: number | null = null;
    for (const obj of objects) {
      if (typeof obj.contextUsagePercentage === "number") pct = obj.contextUsagePercentage;
    }
    console.log(`${label.padEnd(40)} msgs=${String(msgCount).padEnd(6)} body=${bodyMB}MB  hist=${historyMB}MB  ✅ ${pct?.toFixed(2)}%`);
  } else {
    const errText = await response.text();
    console.log(`${label.padEnd(40)} msgs=${String(msgCount).padEnd(6)} body=${bodyMB}MB  hist=${historyMB}MB  ❌ ${response.status}: ${errText.slice(0, 80)}`);
  }
}

async function main() {
  const accessToken = getAccessToken();
  const modelId = "claude-opus-4.6-1m";
  console.log(`Testing structured payloads on ${modelId}\n`);

  // Test 1: Many small messages (high message count)
  console.log("=== Test: Message count scaling (small messages) ===");
  for (const turns of [10, 50, 100, 200, 500]) {
    const history = makeHistory(turns, 100);
    await probe(accessToken, modelId, history, "", `${turns} turns, 100 chars each`);
  }

  // Test 2: Few large messages
  console.log("\n=== Test: Large messages (few turns) ===");
  for (const chars of [10_000, 50_000, 100_000, 200_000]) {
    const history = makeHistory(5, chars);
    await probe(accessToken, modelId, history, "", `5 turns, ${(chars/1000).toFixed(0)}k chars each`);
  }

  // Test 3: With tool calls (4 messages per turn)
  console.log("\n=== Test: Tool call pattern (4 msgs/turn) ===");
  for (const turns of [10, 25, 50, 100, 200]) {
    const history = makeHistoryWithTools(turns, 500);
    await probe(accessToken, modelId, history, "", `${turns} tool turns, 500 chars each`);
  }

  // Test 4: Large system prompt + history
  console.log("\n=== Test: Large system prompt + history ===");
  const bigSystemPrompt = "You are a helpful assistant. ".repeat(2000); // ~56k chars
  for (const turns of [10, 50, 100]) {
    const history = makeHistory(turns, 5000);
    await probe(accessToken, modelId, history, bigSystemPrompt, `sys=56k + ${turns} turns × 5k`);
  }

  // Test 5: Reproduce pi-like payload (big system + many tool turns)
  console.log("\n=== Test: Pi-like payload (big sys + tool turns) ===");
  const piSystemPrompt = "You are a coding assistant. ".repeat(3000); // ~81k chars
  for (const turns of [10, 25, 50, 75, 100]) {
    const history = makeHistoryWithTools(turns, 2000);
    await probe(accessToken, modelId, history, piSystemPrompt, `pi-like: sys=81k + ${turns} tool turns × 2k`);
  }
}

main().catch(console.error);
