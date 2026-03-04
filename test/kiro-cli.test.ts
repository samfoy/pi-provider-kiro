import { describe, expect, it, vi, beforeEach } from "vitest";
import { getKiroCliCredentials, getKiroCliDbPath } from "../src/kiro-cli.js";

// Mock child_process and fs so we can control sqlite3 output
vi.mock("node:child_process", () => ({ execSync: vi.fn() }));
vi.mock("node:fs", () => ({ existsSync: vi.fn() }));

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const mockExecSync = execSync as unknown as ReturnType<typeof vi.fn>;
const mockExistsSync = existsSync as unknown as ReturnType<typeof vi.fn>;

function mockDbQuery(responses: Record<string, string>) {
  mockExistsSync.mockReturnValue(true);
  mockExecSync.mockImplementation((cmd: string) => {
    for (const [key, value] of Object.entries(responses)) {
      if (cmd.includes(key)) return value;
    }
    return "";
  });
}

const futureExpiry = new Date(Date.now() + 3600000).toISOString();

describe("Feature 4: kiro-cli Credential Fallback", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("getKiroCliDbPath", () => {
    it("returns undefined when database does not exist", () => {
      mockExistsSync.mockReturnValue(false);
      expect(getKiroCliDbPath()).toBeUndefined();
    });

    it("returns path when database exists", () => {
      mockExistsSync.mockReturnValue(true);
      expect(getKiroCliDbPath()).toMatch(/kiro-cli.*data\.sqlite3/);
    });
  });

  describe("getKiroCliCredentials", () => {
    it("returns undefined when database does not exist", () => {
      mockExistsSync.mockReturnValue(false);
      expect(getKiroCliCredentials()).toBeUndefined();
    });

    it("reads IDC token with snake_case device registration keys (client_id, client_secret)", () => {
      const tokenData = JSON.stringify({
        access_token: "access-123",
        refresh_token: "refresh-456",
        expires_at: futureExpiry,
        region: "us-east-1",
      });
      const deviceData = JSON.stringify({
        client_id: "my-client-id",
        client_secret: "my-client-secret",
      });
      mockDbQuery({
        "kirocli:odic:token": JSON.stringify([{ value: tokenData }]),
        "device-registration": JSON.stringify([{ value: deviceData }]),
      });

      const result = getKiroCliCredentials();
      expect(result).toBeDefined();
      expect(result!.clientId).toBe("my-client-id");
      expect(result!.clientSecret).toBe("my-client-secret");
      expect(result!.authMethod).toBe("idc");
      expect(result!.refresh).toContain("my-client-id");
      expect(result!.refresh).toContain("my-client-secret");
      expect(result!.refresh.endsWith("|idc")).toBe(true);
    });

    it("reads IDC token with camelCase device registration keys (clientId, clientSecret)", () => {
      const tokenData = JSON.stringify({
        access_token: "access-123",
        refresh_token: "refresh-456",
        expires_at: futureExpiry,
        region: "us-east-1",
      });
      const deviceData = JSON.stringify({
        clientId: "camel-client-id",
        clientSecret: "camel-client-secret",
      });
      mockDbQuery({
        "kirocli:odic:token": JSON.stringify([{ value: tokenData }]),
        "device-registration": JSON.stringify([{ value: deviceData }]),
      });

      const result = getKiroCliCredentials();
      expect(result).toBeDefined();
      expect(result!.clientId).toBe("camel-client-id");
      expect(result!.clientSecret).toBe("camel-client-secret");
    });

    it("returns desktop credentials when IDC token is missing", () => {
      const tokenData = JSON.stringify({
        access_token: "desktop-access",
        refresh_token: "desktop-refresh",
        expires_at: futureExpiry,
        region: "us-west-2",
      });
      mockDbQuery({
        "kirocli:social:token": JSON.stringify([{ value: tokenData }]),
      });

      const result = getKiroCliCredentials();
      expect(result).toBeDefined();
      expect(result!.authMethod).toBe("desktop");
      expect(result!.refresh).toBe("desktop-refresh|desktop");
      expect(result!.region).toBe("us-west-2");
    });

    it("returns undefined when token is expired", () => {
      const tokenData = JSON.stringify({
        access_token: "access-123",
        refresh_token: "refresh-456",
        expires_at: new Date(Date.now() - 60000).toISOString(),
        region: "us-east-1",
      });
      mockDbQuery({
        "kirocli:odic:token": JSON.stringify([{ value: tokenData }]),
      });

      expect(getKiroCliCredentials()).toBeUndefined();
    });

    it("returns undefined when token expires within 2 minutes", () => {
      const tokenData = JSON.stringify({
        access_token: "access-123",
        refresh_token: "refresh-456",
        expires_at: new Date(Date.now() + 60000).toISOString(), // 1 min from now
        region: "us-east-1",
      });
      mockDbQuery({
        "kirocli:odic:token": JSON.stringify([{ value: tokenData }]),
      });

      expect(getKiroCliCredentials()).toBeUndefined();
    });

    it("returns undefined when access_token is missing", () => {
      const tokenData = JSON.stringify({
        refresh_token: "refresh-456",
        expires_at: futureExpiry,
      });
      mockDbQuery({
        "kirocli:odic:token": JSON.stringify([{ value: tokenData }]),
      });

      expect(getKiroCliCredentials()).toBeUndefined();
    });
  });
});
