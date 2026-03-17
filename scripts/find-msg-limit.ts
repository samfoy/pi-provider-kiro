#!/usr/bin/env npx tsx
/**
 * Binary search for exact message count limit on Kiro API.
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
        assistantResponseMessage: {
          content: `Response ${i}: hi`,
        },
      });
    }
  }
  return history;
}

async function probe(accessToken: string, msgCount: number): Promise<boolean> {
  const endpoint = "https://q.us-east-1.amazonaws.com/generateAssistantResponse";
  const mid = crypto.randomUUID().replace(/-/g, "");
  const ua = `aws-sdk-js/1.0.0 ua/2.1 os/nodejs lang/js api/codewhispererruntime#1.0.0 m/E KiroIDE-${mid}`;

  // Ensure even number (alternating user/assistant), ending with assistant
  const history = makeHistory(msgCount);

  const request = {
    conversationState: {
      chatTriggerType: "MANUAL",
      conversationId: crypto.randomUUID(),
      currentMessage: {
        userInputMessage: {
          content: 'Say "OK"',
          modelId: "claude-opus-4.6-1m",
          origin: "AI_EDITOR",
        },
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

  if (response.ok) {
    await response.text(); // consume body
    return true;
  }
  await response.text(); // consume body
  return false;
}

async function main() {
  const accessToken = getAccessToken();
  console.log("Binary search for exact message count limit\n");

  let lo = 100;  // known to work
  let hi = 200;  // known to fail

  while (hi - lo > 2) {
    const mid = Math.floor((lo + hi) / 2);
    // Ensure even
    const testCount = mid % 2 === 0 ? mid : mid + 1;
    process.stdout.write(`  ${testCount} messages... `);
    const ok = await probe(accessToken, testCount);
    if (ok) {
      lo = testCount;
      console.log("✅");
    } else {
      hi = testCount;
      console.log("❌");
    }
  }

  console.log(`\nMessage limit: ${lo} messages OK, ${hi} messages REJECTED`);
  console.log(`That's ${lo / 2} user/assistant turns`);
  console.log(`With tool calls (4 msgs/turn): ~${Math.floor(lo / 4)} tool turns`);
}

main().catch(console.error);
