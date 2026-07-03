import { ArrowRight, GraduationCap } from "lucide-react";
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
          Sau khi lưu, bạn có thể bắt đầu nhập điểm từng học phần và xem tiến độ cập nhật ngay trên Tổng quan.
        </div>
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
