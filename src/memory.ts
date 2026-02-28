import Database from "bun:sqlite"
import type { ModelMessage } from "ai"

let db: Database

function getDB(): Database {
  if (!db) {
    db = new Database("memory.db")
    db.run(`
			CREATE TABLE IF NOT EXISTS messages (
        id    INTEGER PRIMARY KEY AUTOINCREMENT,
        sid   TEXT NOT NULL,
        role  TEXT NOT NULL,
        data  TEXT NOT NULL
      )
		`)
  }

  return db
}

export function saveMessage(sessionID: string, msg: ModelMessage) {
  getDB().run("INSERT INTO messages (sid, role, data) values (?,?,?)", [
    sessionID,
    msg.role,
    JSON.stringify(msg.content),
  ])
}

export function loadMessage(sessionID: string) {
  const rows = getDB()
    .query<
      { role: string; data: string },
      [string]
    >("SELECT role, data FROM messages WHERE sid = ? ORDER BY id ASC")
    .all(sessionID)

  return rows.map((r) => {
    const content = JSON.parse(r.data)
    // OpenAI-compatible APIs expect assistant message content as a plain string,
    // not the array format [{type:'text',text:'...'}] that the AI SDK stores internally.
    const normalizedContent =
      r.role === "assistant" &&
      Array.isArray(content) &&
      content.every(
        (p: unknown) =>
          p && typeof p === "object" && (p as Record<string, unknown>).type === "text",
      )
        ? content
            .map((p: Record<string, unknown>) => p.text as string)
            .join("")
        : content
    return {
      role: r.role as ModelMessage["role"],
      content: normalizedContent,
    }
  })
}
