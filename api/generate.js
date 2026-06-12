// Vercel Serverless Function: POST /api/generate
// Body JSON: { productInfo?: string, imageDataUrl?: string }
import { generateContentPlan, resolveProvider } from "../lib/generate.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Chỉ chấp nhận POST." });
    return;
  }

  try {
    // Vercel tự parse JSON body khi Content-Type: application/json
    const { productInfo, imageDataUrl, apiKey, model, baseUrl } = req.body || {};
    const cfg = resolveProvider({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
      model: model || process.env.OPENAI_MODEL,
      baseUrl: baseUrl || process.env.OPENAI_BASE_URL,
    });
    const plan = await generateContentPlan({ productInfo, imageDataUrl }, cfg);
    res.status(200).json(plan);
  } catch (err) {
    res.status(500).json({ error: err.message || "Lỗi không xác định." });
  }
}

// Cho phép payload ảnh lớn (base64)
export const config = {
  api: {
    bodyParser: { sizeLimit: "10mb" },
  },
};
