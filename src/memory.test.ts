import { test, expect } from "bun:test"

// Test the normalization logic directly (mirrors memory.ts loadMessage logic)
function normalizeContent(role: string, raw: unknown): unknown {
  const content = typeof raw === "string" ? JSON.parse(raw) : raw
  if (
    role === "assistant" &&
    Array.isArray(content) &&
    content.every(
      (p: unknown) =>
        p && typeof p === "object" && (p as Record<string, unknown>).type === "text",
    )
  ) {
    return content.map((p: Record<string, unknown>) => p.text as string).join("")
  }
  return content
}

test("assistant text-array content is flattened to string", () => {
  const stored = JSON.stringify([{ type: "text", text: "Hi! What can I help you with today?" }])
  const result = normalizeContent("assistant", stored)
  expect(result).toBe("Hi! What can I help you with today?")
})

test("multi-part text array is joined", () => {
  const stored = JSON.stringify([
    { type: "text", text: "Hello" },
    { type: "text", text: " world" },
  ])
  expect(normalizeContent("assistant", stored)).toBe("Hello world")
})

test("user message content is not modified", () => {
  const stored = JSON.stringify("hi")
  expect(normalizeContent("user", stored)).toBe("hi")
})

test("assistant message with tool-call is not flattened", () => {
  const content = [
    { type: "text", text: "Let me check" },
    { type: "tool-call", toolName: "bash", input: {} },
  ]
  const stored = JSON.stringify(content)
  expect(normalizeContent("assistant", stored)).toEqual(content)
})

test("plain string assistant content is returned as-is", () => {
  const stored = JSON.stringify("Already a string")
  expect(normalizeContent("assistant", stored)).toBe("Already a string")
})
