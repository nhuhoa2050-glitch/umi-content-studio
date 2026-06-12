// Vercel Serverless Function: GET /api/skills -> danh sách skill (metadata, không kèm prompt)
import { skillsMeta } from "../lib/skills.js";

export default function handler(req, res) {
  res.status(200).json({ skills: skillsMeta() });
}
