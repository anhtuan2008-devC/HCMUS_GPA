"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, GraduationCap, ShieldCheck, Sparkles } from "lucide-react";
import { Button, Field, TextInput } from "@/components/ui";
import { DEFAULT_APP_PATH } from "@/lib/app-routes";

type AuthMode = "sign-in" | "sign-up";

function friendlyAuthError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login")) {
    return "Email hoặc mật khẩu chưa đúng. Bạn kiểm tra lại giúp mình nhé.";
  }

  if (normalized.includes("password")) {
    return "Mật khẩu cần có ít nhất 6 ký tự.";
  }

  if (normalized.includes("email")) {
    return "Email chưa hợp lệ hoặc cần được xác nhận trước khi đăng nhập.";
  }

  return "Có một trục trặc nhỏ khi xử lý đăng nhập. Bạn thử lại sau vài giây nhé.";
}

export function AuthForm({
  initialMode = "sign-in",
}: Readonly<{
  initialMode?: AuthMode;
}>) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [isRoutePending, startRouteTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          mode,
          email,
          password,
        }),
      });
      const payload = (await response.json()) as {
        message?: string;
        hasSession?: boolean;
      };

      if (!response.ok) {
        setErrorMessage(payload.message ?? friendlyAuthError(""));
        return;
      }

      if (payload.hasSession) {
        router.replace(DEFAULT_APP_PATH);
        router.refresh();
        return;
      }

      setInfoMessage(
        payload.message ??
          "Nếu cần xác nhận email, bạn mở hộp thư rồi quay lại đăng nhập nhé.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function changeMode(nextMode: AuthMode) {
    if (nextMode === mode || isRoutePending) {
      return;
    }

    setMode(nextMode);
    setErrorMessage(null);
    setInfoMessage(null);
    startRouteTransition(() => {
      router.replace(nextMode === "sign-up" ? "/dang-ky" : "/dang-nhap");
    });
  }

  const authSignals = [
    {
      label: "Dữ liệu riêng tư",
      description: "Mỗi tài khoản chỉ nhìn thấy hồ sơ và kết quả học tập của chính mình.",
      icon: ShieldCheck,
    },
    {
      label: "Hành trình rõ ràng",
      description: "GPA, tín chỉ và kế hoạch học kỳ được gom vào một không gian dễ theo dõi.",
      icon: Sparkles,
    },
  ];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-3 py-4 sm:px-6 sm:py-8 lg:px-8">
      <div className="grid w-full gap-4 sm:gap-6 lg:grid-cols-[1.05fr_minmax(23.75rem,0.9fr)]">
        <section className="sidebar-shell motion-page relative hidden overflow-hidden rounded-[2.5rem] p-10 text-white lg:block">
          <div className="absolute -right-12 top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div className="inline-flex rounded-[1.4rem] border border-white/15 bg-white/10 px-4 py-3">
            <Image
              src="/brand/hcmus-logo-white.png"
              alt="Logo Trường Đại học Khoa học tự nhiên, ĐHQG-HCM"
              width={180}
              height={54}
              className="h-12 w-auto object-contain"
              priority
            />
          </div>
          <h1 className="mt-8 max-w-2xl font-[family-name:var(--font-display)] text-5xl font-bold leading-tight">
            Bắt đầu không gian học tập cá nhân của bạn.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-white/72">
            Mỗi lần cập nhật điểm là một lần bạn nhìn rõ hơn chặng đường phía trước:
            GPA hiện tại, tín chỉ còn thiếu và kế hoạch học kỳ tiếp theo.
          </p>
          <div className="mt-10 grid gap-3">
            {authSignals.map((signal) => {
              const SignalIcon = signal.icon;

              return (
                <div key={signal.label} className="rounded-2xl border border-white/12 bg-white/10 px-4 py-4">
                  <SignalIcon className="h-5 w-5 text-blue-100" />
                  <p className="mt-3 text-sm font-semibold text-white">{signal.label}</p>
                  <p className="mt-1 text-sm leading-6 text-white/72">{signal.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="soft-card motion-card rounded-[1.5rem] p-4 sm:rounded-[2.5rem] sm:p-8">
          <div className="mb-4 flex items-center gap-3 rounded-[1.15rem] border border-[var(--line)] bg-[var(--surface-tint)] p-3 lg:hidden">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-primary)] text-white shadow-[0_12px_28px_rgba(0,63,136,0.22)]">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-[var(--foreground)]">HCMUS GPA</span>
              <span className="block truncate text-xs text-[var(--muted)]">
                Không gian theo dõi học tập cá nhân
              </span>
            </span>
          </div>

          <div className="relative grid grid-cols-2 items-center rounded-full border border-[var(--line)] bg-white/75 p-1">
            <span
              aria-hidden="true"
              className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-[var(--brand-primary)] shadow-[0_10px_28px_rgba(0,63,136,0.24)] transition-transform duration-300 ease-out"
              style={{
                transform:
                  mode === "sign-up"
                    ? "translateX(calc(100% + 0.25rem))"
                    : "translateX(0)",
              }}
            />
            <button
              type="button"
              onClick={() => changeMode("sign-in")}
              aria-pressed={mode === "sign-in"}
              className={`relative z-10 rounded-full px-3 py-2 text-sm font-semibold transition-colors duration-200 sm:px-4 ${
                mode === "sign-in"
                  ? "text-white"
                  : "text-[var(--muted)] hover:bg-white"
              }`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => changeMode("sign-up")}
              aria-pressed={mode === "sign-up"}
              className={`relative z-10 rounded-full px-3 py-2 text-sm font-semibold transition-colors duration-200 sm:px-4 ${
                mode === "sign-up"
                  ? "text-white"
                  : "text-[var(--muted)] hover:bg-white"
              }`}
            >
              Tạo tài khoản
            </button>
          </div>

          <div className="mt-5 min-h-[6.5rem] transition-opacity duration-200 sm:mt-7 sm:min-h-[7.25rem]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)] sm:text-sm sm:tracking-[0.2em]">
              {mode === "sign-in" ? "Chào mừng trở lại" : "Bắt đầu mới"}
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--foreground)] sm:mt-3 sm:text-3xl">
              {mode === "sign-in" ? "Tiếp tục hành trình học tập." : "Tạo một góc theo dõi riêng cho bạn."}
            </h2>
          </div>

          <form className="mt-5 space-y-3 sm:mt-6 sm:space-y-4" onSubmit={handleSubmit}>
            <Field label="Email">
              <TextInput
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="ban@hcmus.edu.vn"
              />
            </Field>

            <Field label="Mật khẩu">
              <TextInput
                type="password"
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Tối thiểu 6 ký tự"
              />
            </Field>

            {errorMessage ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errorMessage}
              </div>
            ) : null}

            {infoMessage ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {infoMessage}
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={isSubmitting}
              size="lg"
              className="w-full"
            >
              {isSubmitting
                ? "Đang xử lý..."
                : mode === "sign-in"
                  ? "Đăng nhập"
                  : "Tạo tài khoản"}
              {!isSubmitting ? <ArrowRight className="h-4 w-4" /> : null}
            </Button>
          </form>

          <div className="mt-5 rounded-[1.15rem] border border-[var(--line)] bg-[var(--surface-tint)] p-3 lg:hidden">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-primary)]" />
              <p className="text-xs leading-5 text-[var(--muted)] sm:text-sm sm:leading-6">
                Dữ liệu học tập chỉ thuộc về tài khoản của bạn. Đăng nhập xong, bạn sẽ quay lại không gian GPA cá nhân.
              </p>
            </div>
          </div>

          <p className="mt-5 text-sm text-[var(--muted)]">
            Muốn xem lại trang giới thiệu?{" "}
            <Link href="/" className="font-semibold text-[var(--brand-primary)]">
              Quay về trang chủ
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
