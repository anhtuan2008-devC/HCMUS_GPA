import clsx from "clsx";
import { Badge, BadgeGroup, Card, ProgressBar } from "@/components/ui";

export function PanelCard({
  className,
  style,
  children,
}: Readonly<{
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}>) {
  return (
    <Card className={className} style={style}>
      {children}
    </Card>
  );
}

export function StatusPill({
  label,
  tone,
  className,
}: Readonly<{
  label: string;
  tone: "neutral" | "success" | "danger" | "warning";
  className?: string;
}>) {
  return (
    <Badge
      tone={tone === "danger" ? "danger" : tone}
      title={label}
      aria-label={label}
      className={clsx("w-[5.75rem] max-w-[5.75rem]", className)}
    >
      {label}
    </Badge>
  );
}

export function ChipGroup({
  children,
  className,
}: Readonly<{
  children: React.ReactNode;
  className?: string;
}>) {
  return (
    <BadgeGroup className={className}>
      {children}
    </BadgeGroup>
  );
}

export function MeterBar({
  value,
  tone = "brand",
}: Readonly<{
  value: number;
  tone?: "brand" | "orange" | "rose";
}>) {
  const safeValue = Math.max(0, Math.min(100, value));
  const barClassName = {
    brand: "from-[var(--brand-accent)] to-[var(--brand-primary)]",
    orange: "from-amber-200 to-[var(--warning)]",
    rose: "from-rose-300 to-rose-500",
  }[tone];

  if (tone === "brand") {
    return <ProgressBar value={safeValue} />;
  }

  return (
    <div className="h-3 overflow-hidden rounded-full bg-slate-200/70">
      <div
        className={clsx(
          "progress-fill h-full origin-left rounded-full bg-gradient-to-r transition-[width] duration-700",
          barClassName,
        )}
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

export function ProgressRing({
  value,
  label,
  sublabel,
}: Readonly<{
  value: number;
  label: string;
  sublabel: string;
}>) {
  const safeValue = Math.max(0, Math.min(100, value));
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safeValue / 100) * circumference;

  return (
    <div className="relative mx-auto h-40 w-40">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 140 140" aria-hidden="true">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="rgba(0,25,54,0.08)"
          strokeWidth="14"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="url(#credit-progress)"
          strokeLinecap="round"
          strokeWidth="14"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="progress-ring-arc"
          style={
            {
              "--ring-start": circumference,
              "--ring-end": offset,
            } as React.CSSProperties
          }
        />
        <defs>
          <linearGradient id="credit-progress" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-accent)" />
            <stop offset="48%" stopColor="var(--brand-primary)" />
            <stop offset="100%" stopColor="var(--brand-navy)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-3xl font-bold text-[var(--foreground)]">{label}</p>
        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{sublabel}</p>
      </div>
    </div>
  );
}

export function IconBadge({
  children,
  tone = "brand",
}: Readonly<{
  children: React.ReactNode;
  tone?: "brand" | "orange" | "success" | "danger";
}>) {
  const toneClassName = {
    brand: "bg-blue-50 text-[var(--brand-primary)] ring-blue-100",
    orange: "bg-amber-50 text-amber-700 ring-amber-100",
    success: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    danger: "bg-rose-50 text-rose-700 ring-rose-100",
  }[tone];

  return (
    <span
      className={clsx(
        "inline-flex h-[max(2.75rem,40px)] w-[max(2.75rem,40px)] items-center justify-center rounded-2xl ring-1",
        toneClassName,
      )}
    >
      {children}
    </span>
  );
}
