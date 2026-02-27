import { type Skill } from "./skills"

export function buildSystemPrompt(skills: Skill[]): string {
  const env = [
    `cwd: ${process.cwd()}`,
    `platform: ${process.platform}`,
    `date: ${new Date().toISOString().slice(0, 10)}`,
  ].join("\n")

  const skillsBlock =
    skills.length === 0
      ? ""
      : `\n<available_skills>\n${skills.map((s) => `- ${s.name}: ${s.description}`).join("\n")}\n</available_skills>`

  return `You are a helpful AI coding agent with access to tools for reading files and running shell commands.
If a task matches a listed skill, call the skill tool with the skill name to load the full skill content before continuing.

<env>
${env}
</env>${skillsBlock}`
}
