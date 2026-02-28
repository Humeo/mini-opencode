import { tool } from "ai"
import { z } from "zod"
import { type Skill } from "./skills"

export const bashTool = tool({
  description: "",
  inputSchema: z.object({
    command: z.string().describe("the shell command to run"),
    workdir: z
      .string()
      .optional()
      .describe("Working directory (defaults to cwd)"),
  }),
  execute: async ({ command, workdir }) => {
    console.log(`\n[bash] ${command}`)
    const result = await Bun.$`sh -c ${command}`
      .cwd(workdir ?? process.cwd())
      .quiet()
      .nothrow()
    return {
      stdout: result.stdout.toString(),
      stderr: result.stderr.toString(),
      exitCode: result.exitCode,
    }
  },
})

export const readTool = tool({
  description: "read a file from disk",
  inputSchema: z.object({
    path: z.string().describe("Absolute or relative path to the file"),
    offset: z
      .number()
      .optional()
      .describe("Line number to start reading from (1-indexd)"),
    limitd: z.number().optional().describe("Maximum number of lines to read"),
  }),
  execute: async ({ path, offset, limitd }) => {
    console.log(`\n[read] ${path}`)
    const file = Bun.file(path)
    const exist = await file.exists()
    if (!exist) {
      return { error: `file not exist, file path ${path}` }
    }
    const text = file.text()
    const lines = (await text).split("\n")
    const start = (offset ?? 1) - 1
    const slices = limitd
      ? lines.slice(start, start + limitd)
      : lines.slice(start)

    return { content: slices.join("\n"), totalLine: slices.length }
  },
})

export function createSkillTool(skills: Skill[]) {
  const hint =
    skills.length === 0
      ? "No skills available."
      : `Available: ${skills.map((s) => s.name).join(", ")}`

  return tool({
    description:
      skills.length === 0
        ? "Load a skill by name. No skills are currently available."
        : `Load a skill by name and return its full markdown content.\n${skills.map((s) => `- ${s.name}: ${s.description}`).join("\n")}`,
    inputSchema: z.object({
      name: z.string().describe(`Skill name. ${hint}`),
    }),
    execute: async ({ name }) => {
      const skill = skills.find((s) => s.name === name)
      if (!skill) return { error: `Skill "${name}" not found.` }
      console.log(`\n[skill] ${name}`)
      return {
        name: skill.name,
        description: skill.description,
        content: skill.content,
      }
    },
  })
}
