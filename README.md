# HCMUS GPA

Ứng dụng web responsive giúp một sinh viên HCMUS tự quản lý GPA, chương trình học, kế hoạch học kỳ và dự báo kết quả học tập bằng Supabase thật.

## Stack

- Next.js 16, React 19, TypeScript
- Tailwind CSS 4
- Supabase SSR, Auth, Postgres, RLS
- Pipeline OCR/import để chuẩn hóa CTĐT từ `docs/` thành seed có cấu trúc

## Luồng ứng dụng

- `/` là landing page công khai.
- `/dang-nhap` là trang đăng nhập email/password.
- `/dang-ky` là trang tạo tài khoản.
- `/auth` chỉ còn là route tương thích và sẽ chuyển về `/dang-nhap` hoặc `/dang-ky`.
- `/app` là workspace được bảo vệ bằng session cookie SSR.
- Sau đăng nhập, sinh viên chưa có hồ sơ sẽ vào onboarding; sinh viên đã có hồ sơ sẽ vào workspace.
- Chương trình đào tạo được khóa sau lần tạo hồ sơ đầu tiên.

## Biến môi trường

Tạo `.env.local` từ `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000
```

## Supabase CLI

Repo đang dùng các migration chính:

- `supabase/migrations/202607010001_initial_schema.sql`
- `supabase/migrations/202607010002_profile_lock_and_grants.sql`
- `supabase/migrations/202607010003_attempts_preferences_templates.sql`
- `supabase/migrations/202607010004_gpa_flags_and_structured_terms.sql`
- `supabase/migrations/202607010005_term_plan_expected_scores.sql`
- `supabase/migrations/202607010006_course_catalog_program_courses.sql`
- `supabase/migrations/202607010007_brand_security_hardening.sql`
- `supabase/migrations/202607010008_force_rls_and_audit_indexes.sql`
- `supabase/migrations/202607010009_credit_policy_and_curriculum_requirements.sql`
- `supabase/migrations/202607010010_performance_security_maintenance.sql`

Khi cần link CLI với project `oifouqndjignfhtorbep`:

```bash
pnpm dlx supabase@latest login --token <SUPABASE_ACCESS_TOKEN>
pnpm dlx supabase@latest link --project-ref oifouqndjignfhtorbep
```

Sau khi cập nhật migration, đẩy lên Supabase thật trước khi test app:

```bash
pnpm dlx supabase@latest db push
```

## Seed curriculum từ docs

Pipeline OCR/import nằm ở `scripts/build_curriculum_seed.py`.

Chạy toàn bộ:

```bash
python scripts/build_curriculum_seed.py
```

Chạy theo từng CTĐT và tái sử dụng OCR cache:

```bash
python scripts/build_curriculum_seed.py --program ktpm-2024 --use-cached-ocr
python scripts/build_curriculum_seed.py --program cntt-2024 --use-cached-ocr
```

Output:

- `supabase/seed/ocr-debug/*.ocr.json`
- `supabase/seed/curriculum.seed.json`
- `supabase/seed/anomalies.log`
- `supabase/seed.sql`

Sau khi có `supabase/seed.sql`, nạp seed vào database theo flow Supabase bình thường.

## Chạy local

```bash
pnpm install
pnpm tokens:build
pnpm dev
```

## Design system và hiệu năng

- Token nguồn nằm ở `design/tokens/hcmus.tokens.json`.
- Chạy `pnpm tokens:build` để sinh lại `app/design-tokens.css` và `lib/design-tokens/tokens.ts`.
- Route `/design-system` là preview nội bộ cho token, typography scale, button, chip, blueprint card, orbit, timeline, curriculum map và cockpit surface.
- Canvas visual dùng native Canvas 2D với các scene `landing-blueprint`, `dashboard-orbit`, `curriculum-map`, `grades-waveform`, `planner-path`, `analytics-grid`, tự pause khi tab ẩn, cap DPR và tôn trọng `prefers-reduced-motion`.
- Dữ liệu CTĐT/catalog được cache riêng có kiểm soát; dữ liệu cá nhân vẫn luôn `private, no-store`.

## Deploy miễn phí bằng Vercel Hobby

Vercel phù hợp với repo này vì app dùng Next.js SSR, API routes và Supabase Auth.

1. Đẩy repo lên GitHub.
2. Import repo vào Vercel, chọn framework `Next.js` và giữ build command mặc định `next build`.
3. Thêm các biến môi trường production:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=https://<ten-du-an>.vercel.app
```

4. Trong Supabase Auth, cấu hình:

- Site URL: `https://<ten-du-an>.vercel.app`
- Additional Redirect URLs: `http://localhost:3000/**`, `https://<ten-du-an>.vercel.app/**`

5. Deploy production trên Vercel, sau đó smoke test landing, đăng ký/đăng nhập, onboarding, dashboard, planner và GPA Lab.

Lưu ý: Vercel Hobby miễn phí cho dự án cá nhân trong giới hạn free tier. Link `vercel.app` ổn định khi project/account còn hoạt động, nhưng không nền tảng miễn phí nào bảo đảm “vĩnh viễn tuyệt đối”.

## Kiểm tra

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm security:privileges
pnpm security:audit
pnpm ui:audit
pnpm visual:audit
pnpm perf:audit
```

Các script audit giúp giữ app không trượt về UI generic hoặc lộ chi tiết database:

- `security:privileges` kiểm tra migration hardening, RLS và quyền DML.
- `security:audit` rà các pattern rủi ro như raw response, unsafe DOM sink, direct DB field leak, service role trong app code.
- `ui:audit` rà token brand HCMUS, màu/font hard-code và các dấu hiệu UI lệch design system.
- `visual:audit` hiện là alias của `ui:audit`, dành cho workflow QA giao diện trước khi thêm visual regression nặng hơn.
- `perf:audit` rà motion/canvas lifecycle, reduced-motion, cleanup `requestAnimationFrame` và các pattern dễ gây jank.

## Phạm vi hiện tại

- Auth thật bằng email/password.
- Session SSR qua `proxy.ts`.
- API route dùng DTO sạch, `Cache-Control: no-store` cho dữ liệu cá nhân và guard same-origin/rate-limit cho mutation.
- UI dùng brand HCMUS blue, logo local, design tokens và primitives dùng chung.
- Workspace gồm landing, auth, onboarding, dashboard, curriculum, grades, planner và insights.
- Seed runtime không parse PDF; PDF chỉ dùng trong pipeline import.
