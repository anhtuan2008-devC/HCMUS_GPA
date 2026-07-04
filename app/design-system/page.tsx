import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Bell, CheckCircle2, GraduationCap, Save, Sparkles } from "lucide-react";
import { AcademicCanvasScene } from "@/components/visual/academic-canvas-scene";
import {
  Badge,
  BadgeGroup,
  BlueprintCard,
  Button,
  Card,
  ChartFrame,
  CreditOrbit,
  CurriculumMap,
  ProgressBar,
  TermTimeline,
  Typography,
  VectorBadge,
} from "@/components/ui";

const swatches = [
  ["Primary", "var(--brand-primary)"],
  ["Navy", "var(--brand-navy)"],
  ["Accent", "var(--brand-accent)"],
  ["Surface", "var(--surface-tint)"],
  ["Warning", "var(--warning)"],
  ["Success", "var(--success)"],
];

export default function DesignSystemPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl space-y-4 px-3 py-4 sm:space-y-6 sm:px-6 sm:py-8">
      <section className="cockpit-hero learning-cockpit motion-page overflow-hidden rounded-[1.5rem] border border-[var(--line)] p-4 sm:rounded-[2.5rem] sm:p-8">
        <AcademicCanvasScene className="opacity-32" density="low" variant="dashboard-orbit" />
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/74 px-3 py-2 text-sm font-semibold text-[var(--brand-primary)] transition hover:bg-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Về trang chủ
            </Link>
            <div className="mt-5 inline-flex items-center gap-3 rounded-[1.15rem] border border-[var(--line)] bg-white/76 px-3 py-3 shadow-sm sm:rounded-[1.5rem]">
              <Image
                src="/brand/hcmus-logo.png"
                alt="Logo Trường Đại học Khoa học tự nhiên, ĐHQG-HCM"
                width={132}
                height={40}
                className="h-9 w-auto object-contain"
                priority
              />
              <span className="h-8 w-px bg-[var(--line)]" />
              <span className="text-sm font-bold text-[var(--brand-primary)]">Design cockpit</span>
            </div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-primary)]">
              Xưởng kiểm tra giao diện
            </p>
            <Typography as="h1" variant="page-title" className="mt-2 text-[var(--foreground)]">
              Một bộ phận nhỏ để giữ HCMUS GPA không bị chắp vá.
            </Typography>
            <Typography variant="body" className="mt-3 max-w-2xl text-[var(--muted)]">
              Trang này gom các primitive chính: màu, nút, chip, card, progress và chart frame.
              Khi nâng UI, mình soi ở đây trước để mọi màn vẫn chung một hệ.
            </Typography>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:w-[28rem]">
            {swatches.map(([label, color]) => (
              <article key={label} className="learning-signal-card rounded-[1.2rem] p-3">
                <span
                  className="block h-12 rounded-[1rem] border border-white/70 shadow-inner"
                  style={{ background: color }}
                />
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  {label}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
        <Card className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Buttons & chips
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
              Hành động chính phải rõ, hành động phụ phải nhẹ.
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button>
              <Save className="h-4 w-4" />
              Lưu thay đổi
            </Button>
            <Button variant="secondary">
              <Sparkles className="h-4 w-4" />
              Áp dụng gợi ý
            </Button>
            <Button variant="ghost">Xem thêm</Button>
            <Button variant="danger">Xóa</Button>
          </div>
          <BadgeGroup>
            <Badge tone="brand">Tính GPA</Badge>
            <Badge tone="success">Đã đạt</Badge>
            <Badge tone="warning">Cần rà lại</Badge>
            <Badge tone="danger">Chưa đạt</Badge>
            <Badge tone="neutral">3 tín chỉ</Badge>
          </BadgeGroup>
        </Card>

        <Card className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Cockpit cards
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                Dữ liệu ngắn, có nhịp, dễ lướt.
              </h2>
            </div>
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[var(--brand-primary)] ring-1 ring-blue-100">
              <GraduationCap className="h-5 w-5" />
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              ["GPA hệ 10", "8.256", "nhịp tích lũy"],
              ["Tín chỉ", "43/138", "đã tính chính"],
              ["Cảnh báo", "2", "việc nên xem"],
            ].map(([label, value, helper]) => (
              <article key={label} className="learning-signal-card rounded-[1.2rem] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--foreground)]">{value}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{helper}</p>
              </article>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <BlueprintCard className="space-y-5 p-5 sm:p-6">
          <div>
            <Typography variant="overline" className="text-[var(--muted)]">
              Typography scale
            </Typography>
            <Typography as="h2" variant="section-title" className="mt-2 text-[var(--foreground)]">
              Tiêu đề, số liệu và bảng có vai trò riêng.
            </Typography>
            <Typography variant="body-sm" className="mt-2 max-w-2xl text-[var(--muted)]">
              Scale semantic giúp tránh font-size tùy hứng khi UI mở rộng sang desktop và mobile.
            </Typography>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Typography variant="metric-xl" className="text-[var(--brand-primary)]">8.360</Typography>
            <Typography variant="metric-md" className="text-[var(--foreground)]">43/138 TC</Typography>
            <Typography variant="body" className="text-[var(--foreground)]">Nội dung chính đọc thoải mái.</Typography>
            <Typography variant="table-cell" className="text-[var(--muted)]">CSC10004 · 8.000 · Đã đạt</Typography>
          </div>
        </BlueprintCard>

        <BlueprintCard className="space-y-5 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Typography variant="overline" className="text-[var(--muted)]">
                Vector language
              </Typography>
              <Typography as="h2" variant="section-title" className="mt-2 text-[var(--foreground)]">
                Vẽ bằng line, node, orbit thay vì blur dày.
              </Typography>
            </div>
            <div className="flex gap-2">
              <VectorBadge variant="orbit" />
              <VectorBadge variant="map" />
              <VectorBadge variant="wave" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-[11rem_1fr]">
            <CreditOrbit value={43} total={138} label="31%" sublabel="43 / 138 tín chỉ" />
            <TermTimeline
              showConnector
              items={[
                { label: "HK1", value: "Ghi nhận", helper: "điểm thật", active: true },
                { label: "HK2", value: "Lập kế hoạch", helper: "điểm giả sử" },
                { label: "HK3", value: "Dự báo", helper: "GPA kỳ" },
              ]}
            />
          </div>
        </BlueprintCard>
      </div>

      <BlueprintCard className="space-y-5 p-5 sm:p-6">
        <div>
          <Typography variant="overline" className="text-[var(--muted)]">
            Curriculum map
          </Typography>
          <Typography as="h2" variant="section-title" className="mt-2 text-[var(--foreground)]">
            CTĐT nhìn như một bản đồ tín chỉ.
          </Typography>
        </div>
        <CurriculumMap
          sections={[
            { id: "general", title: "Giáo dục đại cương", totalCredits: 56, requiredCredits: 42, electiveCredits: 14 },
            { id: "foundation", title: "Cơ sở ngành", totalCredits: 38, requiredCredits: 38 },
            { id: "major", title: "Chuyên ngành", totalCredits: 34, requiredCredits: 16, electiveCredits: 8, freeElectiveCredits: 10 },
            { id: "graduation", title: "Tốt nghiệp", totalCredits: 10, electiveCredits: 10 },
          ]}
        />
      </BlueprintCard>

      <ChartFrame
        title="Progress, feedback và chart frame"
        description="Các vùng dữ liệu dài cần có khung rõ, feedback dưới 400ms và không làm trang nhảy layout."
        action={
          <Button variant="secondary" size="sm">
            <Bell className="h-4 w-4" />
            Thử cảnh báo
          </Button>
        }
      >
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm font-semibold text-[var(--foreground)]">
                <span>Tiến độ tín chỉ</span>
                <span>72%</span>
              </div>
              <ProgressBar value={72} />
            </div>
            <div className="cockpit-table-scroll rounded-[1.15rem] border border-[var(--line)] bg-white/78">
              <div className="grid min-w-[42rem] grid-cols-[9rem_1fr_8rem_8rem] gap-3 border-b border-[var(--line)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                <span>Mã môn</span>
                <span>Học phần</span>
                <span>Điểm</span>
                <span>Trạng thái</span>
              </div>
              {[
                ["CSC10004", "Nhập môn Công nghệ Thông tin", "8.000", "Đã đạt"],
                ["MTH00021", "Vi tích phân 1", "7.500", "Đã đạt"],
              ].map(([code, title, score, status]) => (
                <div
                  key={code}
                  className="grid min-w-[42rem] grid-cols-[9rem_1fr_8rem_8rem] gap-3 px-4 py-3 text-sm"
                >
                  <span className="font-semibold text-[var(--foreground)]">{code}</span>
                  <span className="truncate text-[var(--foreground)]">{title}</span>
                  <span className="tabular-nums text-[var(--muted)]">{score}</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <article className="metric-card relative min-h-56 overflow-hidden rounded-[1.5rem] p-5 text-white">
            <AcademicCanvasScene className="opacity-46" density="low" variant="analytics-grid" />
            <p className="relative text-xs font-semibold uppercase tracking-[0.2em] text-white/72">
              Motion rule
            </p>
            <p className="relative mt-4 text-3xl font-bold">Transform + opacity</p>
            <p className="relative mt-2 text-sm leading-6 text-white/76">
              Không animate width/height lớn. Không để canvas cạnh tranh với dữ liệu thật.
            </p>
          </article>
        </div>
      </ChartFrame>
    </main>
  );
}
