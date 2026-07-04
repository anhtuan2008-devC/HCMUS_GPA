import { ArrowRight, BookOpenCheck, GraduationCap, MapPinned, ShieldCheck } from "lucide-react";
import { Button, Field, SelectInput, TextInput } from "@/components/ui";
import type { ProgramSummary } from "@/lib/types";
import { IconBadge, PanelCard } from "@/components/workspace/ui";

interface ProfileDraft {
  fullName: string;
  studentCode: string;
  email: string;
  startYear: number;
  programId: string;
}

export function OnboardingPanel({
  draft,
  programs,
  isSaving,
  onChange,
  onSubmit,
}: Readonly<{
  draft: ProfileDraft;
  programs: ProgramSummary[];
  isSaving: boolean;
  onChange: (field: keyof ProfileDraft, value: string | number) => void;
  onSubmit: () => void;
}>) {
  const onboardingSteps = [
    {
      label: "Hồ sơ",
      description: "Gắn tên, MSSV và khóa tuyển để cá nhân hóa mọi số liệu.",
      icon: GraduationCap,
      tone: "brand" as const,
    },
    {
      label: "CTĐT",
      description: "Chọn đúng chương trình một lần, sau đó app giữ ổn định.",
      icon: MapPinned,
      tone: "orange" as const,
    },
    {
      label: "Theo dõi",
      description: "Nhập điểm, xem GPA và lập kế hoạch từ dữ liệu thật.",
      icon: BookOpenCheck,
      tone: "success" as const,
    },
  ];

  return (
    <PanelCard className="motion-page space-y-5 sm:space-y-7">
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-[1fr_16.25rem] lg:items-start">
        <div>
          <div className="flex items-start gap-3">
            <IconBadge tone="brand">
              <GraduationCap className="h-5 w-5" />
            </IconBadge>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)] sm:text-sm sm:tracking-[0.2em]">
                Thiết lập ban đầu
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[var(--foreground)] sm:mt-3 sm:text-3xl">
                Tạo hồ sơ để cá nhân hóa kế hoạch học tập.
              </h2>
            </div>
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)] sm:text-base">
            Bạn chỉ cần chọn đúng chương trình đào tạo một lần. Từ đó, mọi thống kê GPA,
            tín chỉ và gợi ý học kỳ sẽ đi theo chương trình này để tránh nhầm lẫn về sau.
          </p>
        </div>
        <div className="rounded-[1.15rem] border border-[var(--line)] bg-[var(--surface-tint)] px-3 py-3 text-sm leading-7 text-[var(--muted)] sm:rounded-[1.5rem] sm:px-4 sm:py-4">
          <div className="flex gap-2">
            <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-[var(--brand-primary)]" />
            <p>Sau khi lưu, chương trình đào tạo sẽ được khóa để tránh nhập nhầm dữ liệu về sau.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
        {onboardingSteps.map((step, index) => {
          const StepIcon = step.icon;

          return (
            <article key={step.label} className="learning-signal-card rounded-[1.1rem] p-3 sm:rounded-[1.5rem] sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <IconBadge tone={step.tone}>
                  <StepIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                </IconBadge>
                <span className="rounded-full bg-[var(--surface-tint)] px-2 py-1 text-[0.68rem] font-bold text-[var(--brand-primary)] ring-1 ring-[var(--line)]">
                  0{index + 1}
                </span>
              </div>
              <h3 className="mt-3 font-semibold text-[var(--foreground)]">{step.label}</h3>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{step.description}</p>
            </article>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2">
        <Field label="Họ và tên">
          <TextInput
            value={draft.fullName}
            onChange={(event) => onChange("fullName", event.target.value)}
            placeholder="Nguyễn Văn A"
          />
        </Field>

        <Field label="MSSV">
          <TextInput
            value={draft.studentCode}
            onChange={(event) => onChange("studentCode", event.target.value)}
            placeholder="24xxxxxx"
          />
        </Field>

        <Field label="Email">
          <TextInput
            type="email"
            value={draft.email}
            onChange={(event) => onChange("email", event.target.value)}
            placeholder="ban@hcmus.edu.vn"
          />
        </Field>

        <Field label="Khóa tuyển">
          <TextInput
            type="number"
            min={2000}
            max={2100}
            value={draft.startYear}
            onChange={(event) => onChange("startYear", Number(event.target.value))}
          />
        </Field>
      </div>

      <Field label="Chương trình đào tạo">
        <SelectInput
          value={draft.programId}
          onChange={(event) => onChange("programId", event.target.value)}
        >
          {programs.map((program) => (
            <option key={program.id} value={program.id}>
              {program.name} ({program.code})
            </option>
          ))}
        </SelectInput>
      </Field>

      <Button
        type="button"
        onClick={onSubmit}
        disabled={isSaving || !programs.length}
        size="lg"
      >
        {isSaving ? "Đang chuẩn bị hồ sơ..." : "Lưu hồ sơ và vào Tổng quan"}
        {!isSaving ? <ArrowRight className="h-4 w-4" /> : null}
      </Button>
    </PanelCard>
  );
}
