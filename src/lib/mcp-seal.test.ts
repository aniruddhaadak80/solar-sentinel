import { describe, expect, it } from "vitest";
import { POST } from "../app/api/mcp/route";
import { GENESIS_SEAL, sealRecord } from "./seal";

async function callTool(args: Record<string, unknown>) {
  const response = await POST(
    new Request("http://localhost/api/mcp", {
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "verify_seal_chain", arguments: args },
      }),
    })
  );
  return (await response.json()) as {
    result?: { content: Array<{ text: string }> };
    error?: { message: string };
  };
}

describe("verify_seal_chain MCP tool", () => {
  it("detects a tampered record", async () => {
    const record = { score: 42, level: "LOW" };
    const seal = sealRecord(record, GENESIS_SEAL);
    const tampered = { score: 99, level: "LOW" };

    const body = await callTool({ records: [tampered], seals: [seal.seal] });
    const text = body.result?.content[0].text ?? "";
    expect(JSON.parse(text).valid).toBe(false);
  });

  it("confirms an intact chain", async () => {
    const record = { score: 42, level: "LOW" };
    const seal = sealRecord(record, GENESIS_SEAL);

    const body = await callTool({ records: [record], seals: [seal.seal] });
    const text = body.result?.content[0].text ?? "";
    expect(JSON.parse(text).valid).toBe(true);
  });

  it("refuses an empty chain instead of reporting it as valid", async () => {
    const body = await callTool({ records: [], seals: [] });
    expect(body.error?.message).toContain("records and seals");
  });
});
