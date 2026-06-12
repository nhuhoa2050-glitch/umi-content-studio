# 🌊 Umi Content Studio

Bộ **20 skill content & chốt đơn** bằng AI theo framework RBL (tiếng Việt). Chọn skill → nhập ý tưởng/ảnh → AI chạy đúng framework → ra output chuẩn dùng được ngay.

**Nhóm skill:** Chốt đơn ⭐ (kịch bản chốt đơn, kế hoạch nhanh) · Nền tảng (brand voice, customer insight, competitor, content strategy) · Lập kế hoạch (calendar, brief) · Sản xuất (caption, script video, email/zalo, seeding, ads copy, UGC) · Brief visual (image, carousel, video) · Đo lường (audit, report, next plan).

Skill "Kế hoạch nhanh" trả về dạng có tab (kịch bản + đối tượng + kênh + image-brief); các skill còn lại trả về tài liệu Markdown đẹp, copy/tải được.

## Tính năng

- 📷 Đọc ảnh (vision) hoặc text sản phẩm — hoặc cả hai.
- 📝 Sinh 4–6 **kịch bản content** trải đều TOFU/MOFU/BOFU: mỗi kịch bản có 3 hook (Pain/Curiosity/Contrarian), key message, body theo beat, CTA.
- 🎯 Đề xuất **2–3 nhóm đối tượng** (Hot/Warm/Cold) kèm câu nội tâm khách hàng.
- 📡 Đề xuất **kênh triển khai** (format, phễu, tần suất, lý do).
- 🖼️ **Image-brief** đi kèm mỗi kịch bản + 1 **prompt tiếng Anh** sẵn để paste vào Midjourney/DALL·E.
- ⬇️ Xuất Markdown / copy JSON.

## Yêu cầu — chọn 1 nhà cung cấp

Web tương thích **mọi API kiểu OpenAI**, cấu hình qua 3 biến: `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`.

| | Groq (khuyên dùng) | OpenAI |
|---|---|---|
| Chi phí | **Miễn phí** | Trả phí (rất rẻ) |
| Lấy key | https://console.groq.com/keys (`gsk_...`) | https://platform.openai.com/api-keys (`sk-...`) |
| Đọc ảnh | ✅ (model Llama 4) | ✅ (gpt-4o-mini) |
| Base URL | `https://api.groq.com/openai/v1` | `https://api.openai.com/v1` |
| Model | `meta-llama/llama-4-scout-17b-16e-instruct` | `gpt-4o-mini` |

> Cấu hình mẫu cho cả 2 cách nằm sẵn trong [.env.example](.env.example) — chỉ việc bỏ comment dòng tương ứng.
> Nếu Groq đổi tên model, xem danh sách hiện hành: https://console.groq.com/docs/models (chọn model có nhãn *vision* nếu cần đọc ảnh).

---

## Chạy thử trên máy (local) — nhanh nhất

```bash
cd /Volumes/hoamau/Umi
npm run dev                   # không cần cài gì thêm — chỉ dùng Node 18+
```

Mở http://localhost:3000 → bấm **⚙️ Cấu hình API** → dán key Groq miễn phí
(lấy ở https://console.groq.com/keys, dạng `gsk_...`) → **Lưu** → dùng ngay.
Key lưu trong trình duyệt, không cần file `.env`, không cần restart.

> Muốn cấu hình key cố định ở server (không phải nhập trên web): `cp .env.example .env` rồi điền key vào `.env`.

---

## Deploy lên Vercel (để có link dùng mọi nơi)

1. Cài Vercel CLI và đăng nhập:
   ```bash
   npm i -g vercel
   vercel login
   ```
2. Trong thư mục project, chạy:
   ```bash
   vercel
   ```
   (chọn mặc định cho các câu hỏi — Vercel tự nhận `api/` là serverless và `public/` là static).
3. **Thêm biến môi trường** (bắt buộc, để key nằm an toàn ở server). Với Groq free:
   ```bash
   vercel env add OPENAI_API_KEY      # dán key gsk_...
   vercel env add OPENAI_BASE_URL     # https://api.groq.com/openai/v1
   vercel env add OPENAI_MODEL        # meta-llama/llama-4-scout-17b-16e-instruct
   ```
   Mỗi lệnh chọn cả 3 môi trường (Production/Preview/Development).
   (Dùng OpenAI thì chỉ cần `OPENAI_API_KEY`, bỏ 2 biến kia.)
4. Deploy bản chính thức:
   ```bash
   vercel --prod
   ```

Vercel sẽ trả về 1 link `https://...vercel.app` — đó là web của bạn.

> Cách khác không cần CLI: đẩy thư mục này lên GitHub → vào vercel.com → **Add New Project** → import repo → ở mục **Environment Variables** thêm `OPENAI_API_KEY` → Deploy.

---

## Cấu trúc

```
Umi/
├── public/            # frontend (mở trực tiếp)
│   ├── index.html
│   ├── style.css
│   └── app.js
├── api/
│   └── generate.js    # serverless function trên Vercel (POST /api/generate)
├── lib/
│   └── generate.js    # logic gọi OpenAI (dùng chung)
├── server.js          # dev server local (npm run dev)
├── vercel.json
├── .env.example
└── package.json
```

## Tùy chỉnh

- Đổi model: đặt biến `OPENAI_MODEL` (vd `gpt-4o` cho chất lượng cao hơn, đắt hơn).
- Sửa nguyên tắc viết / schema output: trong [lib/generate.js](lib/generate.js) (phần `SYSTEM_PROMPT` và `JSON_SCHEMA_INSTRUCTION`).
