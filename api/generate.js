// Vercel Serverless Function: POST /api/generate
// Body JSON: { skillId?, productInfo?, imageDataUrl?, apiKey?, model?, baseUrl? }
import { generateSkill, resolveProvider } from "../lib/generate.js";
import { getSkill } from "../lib/skills.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Chỉ chấp nhận POST." });
    return;
  }

  try {
    const { productInfo, imageDataUrl, apiKey, model, baseUrl, skillId } = req.body || {};
    const id = skillId || "quick-plan";
    const skill = getSkill(id);
    if (!skill) {
      res.status(400).json({ error: `Skill không tồn tại: ${id}` });
      return;
    }
    const cfg = resolveProvider({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
      model: model || process.env.OPENAI_MODEL,
      baseUrl: baseUrl || process.env.OPENAI_BASE_URL,
    });
    const result = await generateSkill(id, { productInfo, imageDataUrl }, cfg);
    const meta = { id: skill.id, name: skill.name, icon: skill.icon };
    if (skill.structured) res.status(200).json({ type: "plan", plan: result, skill: meta });
    else res.status(200).json({ type: "markdown", markdown: result, skill: meta });
  } catch (err) {
    res.status(500).json({ error: err.message || "Lỗi không xác định." });
  }
}

export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } },
};
