import Image from "next/image";
import clsx from "clsx";
import type { CSSProperties } from "react";
import { AcademicCanvasScene } from "@/components/visual/academic-canvas-scene";

type LoadingShellVariant = "public" | "workspace";

const loadingSteps = ["Đọc dữ liệu học tập", "Ghép chương trình đào tạo", "Chuẩn bị bảng điều khiển"];

export function LoadingShell({
  variant = "public",
}: Readonly<{
  variant?: LoadingShellVariant;
}>) {
  const isWorkspace = variant === "workspace";

  return (
    <main
      className={clsx(
        "learning-loader min-h-screen overflow-hidden px-3 py-4 sm:px-5 sm:py-5",
        isWorkspace ? "mx-auto w-full max-w-[var(--app-max-width)]" : "flex items-center justify-center",
      )}
    >
      <div
        className={clsx(
          "relative w-full",
          isWorkspace
            ? "grid gap-4 lg:grid-cols-[var(--app-sidebar-width)_minmax(0,1fr)]"
            : "mx-auto max-w-5xl",
        )}
      >
        {isWorkspace ? (
          <aside className="sidebar-shell hidden min-h-[calc(100vh-2.5rem)] overflow-hidden rounded-[2rem] p-6 text-white lg:block">
            <div className="inline-flex rounded-[1.35rem] border border-white/15 bg-white/10 px-3 py-3">
              <Image
                src="/brand/hcmus-logo-white.png"
                alt="Logo Trường Đại học Khoa học tự nhiên, ĐHQG-HCM"
                width={168}
                height={50}
                className="h-11 w-auto object-contain"
                priority
              />
            </div>
            <div className="mt-8 space-y-3">
              <div className="skeleton-sheen h-8 w-44 rounded-full bg-white/14" />
              <div className="skeleton-sheen h-4 w-36 rounded-full bg-white/10" />
            </div>
            <div className="mt-12 space-y-3">
              {[0, 1, 2, 3, 4].map((item) => (
                <div key={item} className="skeleton-sheen h-12 rounded-2xl bg-white/10" />
              ))}
            </div>
          </aside>
        ) : null}

        <section
          className={clsx(
            "soft-card motion-page relative overflow-hidden rounded-[1.5rem] p-4 sm:rounded-[2.5rem] sm:p-8",
            isWorkspace ? "min-h-[calc(100vh-2.5rem)]" : "mx-auto max-w-3xl",
          )}
        >
          <AcademicCanvasScene className="opacity-35" density="low" variant="loading-orbit" />
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[var(--surface-tint)] blur-3xl" />
          <div className="absolute -bottom-20 left-8 h-52 w-52 rounded-full bg-[var(--brand-accent-soft)] blur-3xl" />

          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-3 rounded-[1.15rem] border border-[var(--line)] bg-white/78 px-3 py-3 shadow-sm sm:rounded-[1.5rem]">
                <Image
                  src="/brand/hcmus-logo.png"
                  alt="Logo Trường Đại học Khoa học tự nhiên, ĐHQG-HCM"
                  width={132}
                  height={40}
                  className="h-9 w-auto object-contain"
                  priority
                />
                <span className="h-8 w-px bg-[var(--line)]" />
                <span className="text-sm font-bold text-[var(--brand-primary)]">GPA</span>
              </div>

              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-primary)] sm:text-sm sm:tracking-[0.22em]">
                Đang chuẩn bị không gian học tập
              </p>
              <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--foreground)] sm:text-4xl">
                Một chút thôi, dữ liệu của bạn đang được xếp gọn.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
                App đang dựng lại bức tranh GPA, tín chỉ và kế hoạch học kỳ để khi mở ra mọi thứ
                đã sẵn sàng cho quyết định tiếp theo.
              </p>

              <div className="mt-6 space-y-3">
                {loadingSteps.map((step, index) => (
                  <div key={step} className="flex items-center gap-3">
                    <span className="learning-loader-dot flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand-primary)] text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--foreground)]">{step}</p>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--surface-tint)]">
                        <div
                          className="learning-loader-rail h-full rounded-full bg-gradient-to-r from-[var(--brand-accent)] to-[var(--brand-primary)]"
                          style={{ "--delay": `${index * 140}ms` } as CSSProperties}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="learning-loader-orbit relative mx-auto hidden h-56 w-56 items-center justify-center rounded-full border border-[var(--line)] bg-white/62 lg:flex">
              <div className="absolute h-36 w-36 rounded-full border border-[var(--line)]" />
              <div className="absolute h-20 w-20 rounded-full bg-[var(--brand-primary)] shadow-[0_24px_60px_rgba(0,63,136,0.24)]" />
              <div className="absolute h-8 w-8 rounded-full bg-[var(--brand-accent)]" />
            </div>
          </div>

          {isWorkspace ? (
            <div className="relative mt-8 grid gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="skeleton-sheen h-24 rounded-[1.25rem] border border-[var(--line)] bg-white/68" />
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
