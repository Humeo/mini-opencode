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
  getDB().run("INSERT INTO message (sid, role, data) values (?,?,?)", [
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

  return rows.map((r) => ({
    role: r.role as ModelMessage["role"],
    content: JSON.parse(r.data),
  }))
}
