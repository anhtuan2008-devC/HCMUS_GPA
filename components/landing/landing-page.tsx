import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpenCheck, LineChart, Sparkles } from "lucide-react";
import { AcademicCanvasScene } from "@/components/visual/academic-canvas-scene";
import { Typography, VectorBadge } from "@/components/ui";

const programs = [
  {
    code: "7480201",
    name: "Công nghệ thông tin",
    accent: "from-blue-200/80 via-sky-100 to-transparent",
  },
  {
    code: "7480101",
    name: "Khoa học máy tính",
    accent: "from-sky-200/70 via-blue-100 to-transparent",
  },
  {
    code: "7480103",
    name: "Kỹ thuật phần mềm",
    accent: "from-indigo-200/70 via-blue-100 to-transparent",
  },
  {
    code: "7480104",
    name: "Hệ thống thông tin",
    accent: "from-lime-200/70 via-emerald-100 to-transparent",
  },
];

const highlights = [
  {
    title: "Nhìn rõ bức tranh học tập",
    description: "GPA, tín chỉ tích lũy, môn còn thiếu và các cảnh báo quan trọng được gom lại ở một nơi.",
    icon: LineChart,
  },
  {
    title: "Chủ động từng học kỳ",
    description: "Lên kế hoạch môn học tiếp theo dựa trên chương trình đào tạo và điều kiện tiên quyết.",
    icon: BookOpenCheck,
  },
  {
    title: "Giữ động lực dài hạn",
    description: "Mô phỏng mục tiêu điểm để biết mỗi học phần đang kéo mình đến gần mục tiêu ra sao.",
    icon: Sparkles,
  },
];

const cockpitMetrics = [
  ["4", "CTĐT khóa 2024"],
  ["10→4", "quy đổi GPA"],
  ["138", "tín chỉ chính"],
];

const journeySteps = [
  "Chọn chương trình học",
  "Ghi nhận kết quả thật",
  "Lập kế hoạch kỳ tới",
  "Dự báo mục tiêu GPA",
];

export function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-3 py-4 sm:gap-8 sm:px-6 sm:py-6 lg:px-8 lg:py-10">
      <section className="surface-blueprint motion-page relative overflow-hidden rounded-[1.5rem] px-4 py-6 sm:rounded-[2.5rem] sm:px-8 lg:px-12 lg:py-14">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top_left,rgba(7,102,255,0.18),transparent_44%),radial-gradient(circle_at_top_right,rgba(0,63,136,0.18),transparent_42%)]" />
        <AcademicCanvasScene className="opacity-70" variant="landing-blueprint" />
        <div className="relative grid gap-6 sm:gap-10 lg:grid-cols-[1.2fr_minmax(20rem,0.8fr)] lg:items-center">
          <div className="space-y-5 sm:space-y-7">
            <div className="inline-flex items-center gap-3 rounded-[1.15rem] border border-[var(--line)] bg-white/80 px-3 py-2.5 shadow-[0_12px_32px_rgba(0,25,54,0.08)] sm:gap-4 sm:rounded-[1.5rem] sm:px-4 sm:py-3">
              <Image
                src="/brand/hcmus-logo.png"
                alt="Logo Trường Đại học Khoa học tự nhiên, ĐHQG-HCM"
                width={142}
                height={44}
                priority
                className="h-9 w-auto object-contain sm:h-11"
              />
              <span className="hidden h-8 w-px bg-[var(--line)] sm:block" />
              <span className="text-sm font-semibold text-[var(--brand-primary)]">
                Không gian học tập cá nhân
              </span>
            </div>
            <div className="space-y-4">
              <Typography as="h1" variant="hero" className="max-w-3xl text-[var(--foreground)]">
                Tự quản lý GPA, tiến độ tốt nghiệp và kế hoạch học kỳ của bạn.
              </Typography>
              <Typography variant="body" className="max-w-2xl text-[var(--muted)]">
                HCMUS GPA giúp bạn biến những con số rời rạc thành một hành trình rõ ràng:
                biết mình đang ở đâu, còn thiếu gì và nên ưu tiên điều gì trong học kỳ tới.
              </Typography>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/dang-ky"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold !text-white shadow-[0_14px_34px_rgba(0,63,136,0.26)] transition hover:bg-[var(--brand-primary-strong)] sm:px-5 sm:py-3"
              >
                Bắt đầu hành trình
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/app/tong-quan"
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--line)] bg-white/80 px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--line-strong)] hover:bg-white sm:px-5 sm:py-3"
              >
                Tiếp tục không gian của tôi
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="metric-card relative overflow-hidden rounded-[1.5rem] p-4 text-white sm:rounded-[2rem] sm:p-6">
              <div className="absolute right-5 top-5 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
              <AcademicCanvasScene className="opacity-45" density="low" variant="dashboard-orbit" />
              <p className="typo-overline relative text-white/70">
                Mục tiêu hôm nay
              </p>
              <p className="relative mt-4 text-4xl font-bold tracking-tight sm:mt-6 sm:text-5xl">3.20</p>
              <p className="relative mt-2 text-sm text-white/70">GPA hệ 4 mục tiêu</p>
              <div className="relative mt-4 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm leading-6 text-white/82 sm:mt-6 sm:rounded-2xl sm:px-4 sm:py-3">
                Tập trung vào môn then chốt, giữ nhịp điểm ổn định và theo dõi tiến độ sau mỗi lần cập nhật.
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {cockpitMetrics.map(([value, label]) => (
                <div
                  key={label}
                  className="learning-signal-card rounded-[1.1rem] border border-[var(--line)] bg-white/76 px-3 py-3 text-center shadow-[0_12px_32px_rgba(0,25,54,0.06)]"
                >
                  <p className="text-xl font-bold text-[var(--brand-primary)]">{value}</p>
                  <p className="mt-1 text-[0.68rem] font-semibold leading-4 text-[var(--muted)]">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="soft-card motion-card learning-cockpit overflow-hidden rounded-[1.35rem] px-4 py-4 sm:rounded-[2rem] sm:px-5 sm:py-5">
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Một hành trình, bốn nhịp chính
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)] sm:text-2xl">
              Từ dữ liệu rời rạc thành kế hoạch học tập có nhịp.
            </h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-4 lg:min-w-[38rem]">
            {journeySteps.map((step, index) => (
              <div
                key={step}
                className="learning-signal-card rounded-[1rem] border border-[var(--line)] bg-white/78 px-3 py-3"
              >
                <VectorBadge
                  variant={index % 2 ? "path" : "map"}
                  className="h-9 w-9 rounded-full bg-[var(--surface-tint)]"
                  title={`Bước ${index + 1}`}
                />
                <p className="mt-3 text-sm font-semibold leading-5 text-[var(--foreground)]">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:gap-4 lg:grid-cols-3">
        {highlights.map((item, index) => {
          const Icon = item.icon;

          return (
            <article
              key={item.title}
              className="soft-card motion-card hover-lift rounded-[1.35rem] px-4 py-4 sm:rounded-[2rem] sm:px-5 sm:py-5"
              style={{ "--delay": `${index * 90}ms` } as React.CSSProperties}
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[var(--brand-primary)] ring-1 ring-blue-100">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-lg font-semibold text-[var(--foreground)] sm:mt-5 sm:text-xl">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{item.description}</p>
            </article>
          );
        })}
      </section>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {programs.map((program, index) => (
          <article
            key={program.code}
            className="soft-card motion-card hover-lift relative overflow-hidden rounded-[1.35rem] px-4 py-4 sm:rounded-[2rem] sm:px-5 sm:py-5"
            style={{ "--delay": `${120 + index * 70}ms` } as React.CSSProperties}
          >
            <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-br ${program.accent}`} />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Mã ngành {program.code}
              </p>
              <h3 className="mt-2 text-base font-semibold text-[var(--foreground)] sm:mt-3 sm:text-xl">{program.name}</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Khóa tuyển 2024</p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
