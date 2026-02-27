import { z } from "zod"
import matter from "gray-matter"
import { join } from "path"

export interface Skill {
  name: string
  description: string
  content: string
}

const Frontmatter = z.object({
  name: z.string(),
  description: z.string(),
})

function parseFrontmatter(text: string): {
  name?: string
  description?: string
} {
  const parsed = Frontmatter.safeParse(matter(text))
  if (!parsed.success) return {}
  return parsed.data
}

export async function loadSkills(skillDir: string): Promise<Skill[]> {
  const glob = new Bun.Glob("**/SKILL.md")
  const skills: Skill[] = []

  for await (const rel of glob.scan({ cwd: skillDir })) {
    const content = await Bun.file(join(skillDir, rel)).text()
    const { name, description } = parseFrontmatter(content)
    if (name && description) {
      skills.push({ name: name, description: description, content: content })
      console.log(`load skill ${name} !`)
    }
  }

  return skills
}
