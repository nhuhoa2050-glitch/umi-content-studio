// Core content-generation logic — gọi OpenAI, dùng chung cho serverless (Vercel) và local dev server.
// Không phụ thuộc framework nào, chỉ dùng global fetch (Node 18+).

const SYSTEM_PROMPT = `Bạn là một Content Strategist kỳ cựu theo framework RBL (Run By Linh), chuyên thị trường Việt Nam.
Nhiệm vụ: từ thông tin sản phẩm (text) và/hoặc ảnh người dùng cung cấp, tự động đề xuất một bộ kế hoạch content hoàn chỉnh.

NGUYÊN TẮC RBL BẮT BUỘC:
- Hook 3 giây đầu quyết định 80% — câu đầu phải đứng độc lập, hit pain hoặc curiosity, KHÔNG chào hỏi, KHÔNG bắt đầu bằng tên brand.
- 1 bài = 1 message = 1 CTA. Không nhồi nhiều benefit.
- Số liệu cụ thể > tính từ mơ hồ ("tăng 47% doanh thu" > "tăng mạnh").
- Phân tầng phễu rõ: TOFU (nhận biết, không nhắc giá) / MOFU (tin tưởng, có social proof) / BOFU (chốt, có offer/urgency).
- CTA = động từ + lợi ích cụ thể, không chỉ "Liên hệ ngay".
- TUYỆT ĐỐI tránh các từ: "Siêu hot", "Không thể bỏ lỡ", "Hãy cùng chúng tôi", "Đừng bỏ lỡ cơ hội", "Hàng triệu KH tin dùng" (nếu không có bằng chứng).
- Câu nói nội tâm của khách phải viết bằng đúng ngôn ngữ KH thật dùng, không viết như copywriter.
- Image brief phải đủ để designer làm ngay, kèm 1 prompt tiếng Anh sẵn để paste vào Midjourney/DALL·E.

Bạn PHẢI trả về DUY NHẤT một JSON hợp lệ theo đúng schema được yêu cầu, viết bằng TIẾNG VIỆT (trừ field image_prompt viết tiếng Anh). Không thêm markdown, không thêm lời dẫn.`;

const JSON_SCHEMA_INSTRUCTION = `Trả về JSON theo đúng cấu trúc sau:
{
  "product_summary": "1-2 câu tóm tắt sản phẩm/nhu cầu suy ra từ input",
  "positioning": "1 câu định vị: '[Brand/SP] là lựa chọn cho [target] muốn [outcome] mà không cần [pain]'",
  "target_audiences": [
    {
      "tier": "Hot | Warm | Cold",
      "name": "tên ngắn của nhóm KH",
      "demographic": "tuổi/giới/nghề/địa lý ngắn gọn",
      "pain": "nỗi đau chính",
      "inner_voice": "câu nội tâm KH tự nói (ngôn ngữ thật của KH)",
      "where_to_reach": "kênh/nơi tiếp cận nhóm này"
    }
  ],
  "channels": [
    {
      "channel": "TikTok | Facebook Page | Instagram | Email | Zalo OA | Facebook Group...",
      "format": "Video 15-60s | Carousel | Static post | Email...",
      "funnel": "TOFU | MOFU | BOFU",
      "frequency": "vd 4-5 video/tuần",
      "reason": "vì sao chọn kênh này cho sản phẩm/đối tượng này"
    }
  ],
  "content_scripts": [
    {
      "title": "tiêu đề nội bộ của kịch bản",
      "funnel": "TOFU | MOFU | BOFU",
      "channel": "kênh đăng",
      "format": "video | carousel | caption | email",
      "hooks": [
        {"type": "Pain", "text": "hook đánh vào nỗi đau"},
        {"type": "Curiosity", "text": "hook gây tò mò"},
        {"type": "Contrarian", "text": "hook nói ngược điều ai cũng nghĩ"}
      ],
      "recommended_hook": "Pain | Curiosity | Contrarian — kèm lý do ngắn",
      "key_message": "1 câu thông điệp cốt lõi",
      "body": ["beat/điểm 1", "beat/điểm 2", "beat/điểm 3 (tối đa 3)"],
      "cta": "CTA cụ thể",
      "image_brief": {
        "concept": "idea 1 câu của ảnh đi kèm",
        "emotion": "cảm xúc muốn truyền tải",
        "composition": "bố cục/focal point/layout",
        "colors": "màu chủ đạo gợi ý",
        "text_overlay": "text cần lên ảnh (nếu có)",
        "image_prompt": "1 prompt TIẾNG ANH sẵn để paste vào Midjourney/DALL·E"
      }
    }
  ]
}

Yêu cầu số lượng: 2-3 target_audiences, 3-4 channels, 4-6 content_scripts trải đều TOFU/MOFU/BOFU.`;

/**
 * Tự suy ra baseUrl + model từ tiền tố của API key khi chưa cấu hình rõ.
 * - gsk_... -> Groq (free, model Llama 4 vision)
 * - còn lại -> OpenAI (gpt-4o-mini)
 */
export function resolveProvider({ apiKey, baseUrl, model } = {}) {
  const key = (apiKey || "").trim();
  const isGroq = key.startsWith("gsk_");
  return {
    apiKey: key,
    baseUrl: baseUrl || (isGroq ? "https://api.groq.com/openai/v1" : "https://api.openai.com/v1"),
    model: model || (isGroq ? "meta-llama/llama-4-scout-17b-16e-instruct" : "gpt-4o-mini"),
  };
}

/**
 * Sinh kế hoạch content. Hoạt động với mọi endpoint tương thích OpenAI
 * (OpenAI, Groq free, hoặc nhà cung cấp khác) — chỉ cần đổi baseUrl + model.
 * @param {object} input
 * @param {string} [input.productInfo] - text thông tin sản phẩm / nhu cầu
 * @param {string} [input.imageDataUrl] - ảnh dạng data URL (data:image/...;base64,...)
 * @param {object} cfg
 * @param {string} cfg.apiKey - API key
 * @param {string} [cfg.model] - model id
 * @param {string} [cfg.baseUrl] - base URL của API (mặc định OpenAI)
 * @returns {Promise<object>} JSON kế hoạch content
 */
export async function generateContentPlan(
  { productInfo, imageDataUrl },
  { apiKey, model = "gpt-4o-mini", baseUrl = "https://api.openai.com/v1" } = {}
) {
  if (!apiKey) {
    throw new Error("Thiếu API key. Cấu hình OPENAI_API_KEY (hoặc key Groq) trong biến môi trường / file .env.");
  }
  if (!productInfo && !imageDataUrl) {
    throw new Error("Cần ít nhất thông tin sản phẩm (text) hoặc một ảnh.");
  }

  const userContent = [];
  const introText = productInfo
    ? `Thông tin sản phẩm / nhu cầu do người dùng cung cấp:\n"""\n${productInfo}\n"""`
    : `Người dùng chỉ cung cấp ảnh dưới đây. Hãy phân tích ảnh để suy ra sản phẩm/nhu cầu.`;
  userContent.push({ type: "text", text: `${introText}\n\n${JSON_SCHEMA_INSTRUCTION}` });

  if (imageDataUrl) {
    userContent.push({ type: "image_url", image_url: { url: imageDataUrl } });
  }

  const body = {
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    response_format: { type: "json_object" },
    temperature: 0.8,
    max_tokens: 4000,
  };

  const endpoint = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const resp = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    const lower = errText.toLowerCase();
    if (resp.status === 401 || resp.status === 403) {
      throw new Error("API key sai hoặc hết hạn. Kiểm tra lại key trong '⚙️ Cấu hình API'. Key Groq miễn phí lấy ở console.groq.com/keys.");
    }
    if (resp.status === 404 || lower.includes("model") && (lower.includes("not") || lower.includes("decommission") || lower.includes("does not exist"))) {
      throw new Error(`Model '${model}' không khả dụng. Mở '⚙️ Cấu hình API', điền Model khác (xem danh sách: console.groq.com/docs/models — chọn model có nhãn vision nếu cần đọc ảnh).`);
    }
    if (resp.status === 429) {
      throw new Error("Đã chạm giới hạn miễn phí tạm thời (rate limit). Đợi một lát rồi thử lại.");
    }
    throw new Error(`API lỗi ${resp.status}: ${errText.slice(0, 400)}`);
  }

  const data = await resp.json();
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) throw new Error("API không trả về nội dung.");

  try {
    return JSON.parse(raw);
  } catch {
    // phòng trường hợp model bọc trong ```json
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error("Không parse được JSON từ model.");
  }
}
