import clsx from "clsx";
import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from "react";

type TypographyVariant =
  | "hero"
  | "page-title"
  | "section-title"
  | "card-title"
  | "metric-xl"
  | "metric-md"
  | "body"
  | "body-sm"
  | "caption"
  | "overline"
  | "table-cell";

const typographyClassName: Record<TypographyVariant, string> = {
  hero: "typo-hero",
  "page-title": "typo-page-title",
  "section-title": "typo-section-title",
  "card-title": "typo-card-title",
  "metric-xl": "typo-metric-xl",
  "metric-md": "typo-metric-md",
  body: "typo-body",
  "body-sm": "typo-body-sm",
  caption: "typo-caption",
  overline: "typo-overline",
  "table-cell": "typo-table-cell",
};

export function Typography({
  as,
  variant = "body",
  className,
  ...props
}: HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  variant?: TypographyVariant;
}) {
  const Component = as ?? "p";

  return <Component className={clsx(typographyClassName[variant], className)} {...props} />;
}

export function BlueprintCard({
  tone = "light",
  className,
  ...props
}: HTMLAttributes<HTMLElement> & {
  tone?: "light" | "dark";
}) {
  return (
    <section
      className={clsx(tone === "dark" ? "surface-blueprint-dark" : "surface-blueprint", className)}
      {...props}
    />
  );
}

export function VectorBadge({
  variant = "orbit",
  className,
  title,
}: Readonly<{
  variant?: "orbit" | "map" | "wave" | "path" | "grid" | "spark";
  className?: string;
  title?: string;
}>) {
  return (
    <span
      className={clsx(
        "inline-flex h-11 w-11 items-center justify-center rounded-[1rem] border border-[var(--line)] bg-white/78 text-[var(--brand-primary)] shadow-[0_10px_24px_rgba(0,25,54,0.06)]",
        className,
      )}
      title={title}
      aria-hidden={title ? undefined : "true"}
    >
      <svg className="h-7 w-7" viewBox="0 0 48 48" fill="none">
        {variant === "orbit" ? (
          <>
            <circle cx="24" cy="24" r="14" className="vector-stroke opacity-35" />
            <ellipse cx="24" cy="24" rx="18" ry="7" className="vector-stroke opacity-65" />
            <circle cx="34" cy="19" r="3" fill="currentColor" />
          </>
        ) : null}
        {variant === "map" ? (
          <>
            <path d="M10 34L18 20L28 27L38 13" className="vector-stroke" />
            <circle cx="10" cy="34" r="3" fill="currentColor" />
            <circle cx="18" cy="20" r="3" fill="currentColor" />
            <circle cx="28" cy="27" r="3" fill="currentColor" />
            <circle cx="38" cy="13" r="3" fill="currentColor" />
          </>
        ) : null}
        {variant === "wave" ? (
          <path d="M6 26C10 15 14 15 18 26C22 37 26 37 30 26C34 15 38 15 42 26" className="vector-stroke" />
        ) : null}
        {variant === "path" ? (
          <>
            <path d="M8 34C15 14 26 40 40 14" className="vector-stroke" />
            <circle cx="8" cy="34" r="3" fill="currentColor" />
            <circle cx="40" cy="14" r="3" fill="currentColor" />
          </>
        ) : null}
        {variant === "grid" ? (
          <>
            <path d="M12 10V38M24 10V38M36 10V38M8 16H40M8 28H40" className="vector-stroke opacity-55" />
            <path d="M12 33L20 24L28 28L36 17" className="vector-stroke" />
          </>
        ) : null}
        {variant === "spark" ? (
          <>
            <path d="M24 7L28 20L41 24L28 28L24 41L20 28L7 24L20 20L24 7Z" className="vector-stroke" />
            <circle cx="24" cy="24" r="3" fill="currentColor" />
          </>
        ) : null}
      </svg>
    </span>
  );
}

export type DataRailItem = {
  label: string;
  value: string;
  helper?: string;
  icon?: ReactNode;
  tone?: "brand" | "success" | "warning" | "danger";
};

export function DataRail({
  items,
  className,
}: Readonly<{
  items: DataRailItem[];
  className?: string;
}>) {
  return (
    <div className={clsx("grid gap-2 sm:grid-cols-3", className)}>
      {items.map((item) => (
        <article key={item.label} className="blueprint-data-tile">
          <div className="flex items-center justify-between gap-2">
            <Typography variant="overline" className="text-[var(--muted)]">
              {item.label}
            </Typography>
            {item.icon ? <span className="text-[var(--brand-primary)]">{item.icon}</span> : null}
          </div>
          <Typography variant="metric-md" className="mt-2 truncate text-[var(--foreground)]" title={item.value}>
            {item.value}
          </Typography>
          {item.helper ? (
            <Typography variant="caption" className="mt-1 truncate text-[var(--muted)]" title={item.helper}>
              {item.helper}
            </Typography>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function svgNumber(value: number) {
  return value.toFixed(3);
}

export function CreditOrbit({
  value,
  total,
  label,
  sublabel,
  className,
}: Readonly<{
  value: number;
  total: number;
  label?: string;
  sublabel?: string;
  className?: string;
}>) {
  const safeTotal = Math.max(1, total);
  const rate = Math.max(0, Math.min(100, (value / safeTotal) * 100));
  const radius = 43;
  const circumference = svgNumber(2 * Math.PI * radius);
  const offset = svgNumber(Number(circumference) - (rate / 100) * Number(circumference));

  return (
    <div className={clsx("credit-orbit", className)}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        {Array.from({ length: 24 }, (_, index) => {
          const angle = (index / 24) * Math.PI * 2;
          const x1 = svgNumber(60 + Math.cos(angle) * 52);
          const y1 = svgNumber(60 + Math.sin(angle) * 52);
          const x2 = svgNumber(60 + Math.cos(angle) * 57);
          const y2 = svgNumber(60 + Math.sin(angle) * 57);

          return (
            <line
              key={index}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              className="stroke-[var(--line-strong)]"
              strokeWidth="1"
            />
          );
        })}
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(0,25,54,0.08)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="var(--brand-primary)"
          strokeLinecap="round"
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="progress-ring-arc"
          style={
            {
              "--ring-start": circumference,
              "--ring-end": offset,
            } as CSSProperties
          }
        />
      </svg>
      <div className="credit-orbit-copy">
        <Typography variant="metric-md" className="text-[var(--foreground)]">
          {label ?? `${Math.round(rate)}%`}
        </Typography>
        <Typography variant="caption" className="text-[var(--muted)]">
          {sublabel ?? `${value}/${total} tín chỉ`}
        </Typography>
      </div>
    </div>
  );
}

export function TermTimeline({
  items,
  className,
  showConnector = false,
}: Readonly<{
  items: Array<{ label: string; value: string; helper?: string; active?: boolean }>;
  className?: string;
  showConnector?: boolean;
}>) {
  return (
    <div className={clsx("term-timeline", showConnector && "has-connector", className)}>
      {items.map((item, index) => (
        <article key={`${item.label}-${index}`} className={clsx("term-timeline-node", item.active && "is-active")}>
          <span className="term-timeline-dot" />
          <Typography variant="caption" className="mt-2 truncate text-[var(--muted)]" title={item.label}>
            {item.label}
          </Typography>
          <Typography variant="card-title" className="truncate text-[var(--foreground)]" title={item.value}>
            {item.value}
          </Typography>
          {item.helper ? (
            <Typography variant="caption" className="truncate text-[var(--muted)]" title={item.helper}>
              {item.helper}
            </Typography>
          ) : null}
        </article>
      ))}
    </div>
  );
}

export function CurriculumMap({
  sections,
  className,
}: Readonly<{
  sections: Array<{
    id: string;
    title: string;
    category?: string;
    totalCredits: number;
    requiredCredits?: number;
    electiveCredits?: number;
    freeElectiveCredits?: number;
    countsTowardProgramTotal?: boolean;
    sourceNote?: string;
  }>;
  className?: string;
}>) {
  return (
    <div className={clsx("curriculum-map", className)}>
      {sections.map((section, index) => {
        const requiredCredits = section.requiredCredits ?? 0;
        const electiveCredits = section.electiveCredits ?? 0;
        const freeElectiveCredits = section.freeElectiveCredits ?? 0;
        const isMajorSection = section.category === "major";

        return (
          <article key={section.id} className="curriculum-map-node">
            <div className="curriculum-map-head">
              <span className="curriculum-map-index">{index + 1}</span>
              <span className="curriculum-map-total">{section.totalCredits} TC</span>
            </div>
            <Typography
              variant="card-title"
              className="mt-3 line-clamp-2 text-[var(--foreground)]"
              title={section.title}
            >
              {section.title}
            </Typography>
            <div className="curriculum-map-credit-row">
              <span className={clsx("curriculum-map-chip", requiredCredits ? "is-primary" : "is-muted")}>
                {requiredCredits} BB
              </span>
              <span className={clsx("curriculum-map-chip", electiveCredits ? "is-choice" : "is-muted")}>
                {electiveCredits} tự chọn
              </span>
              <span className={clsx("curriculum-map-chip", freeElectiveCredits ? "is-free" : "is-muted")}>
                {freeElectiveCredits} TCTD
              </span>
            </div>
            <Typography
              variant="caption"
              className="curriculum-map-note text-[var(--muted)]"
              title={isMajorSection ? "Theo dõi tổng CTĐT, chưa khóa hướng chuyên ngành." : section.sourceNote}
            >
              {isMajorSection
                ? "Theo dõi tổng CTĐT, chưa khóa hướng chuyên ngành."
                : section.countsTowardProgramTotal === false
                  ? "Điều kiện riêng, không cộng tổng tín chỉ chính."
                  : section.sourceNote ?? "Tính vào tổng tín chỉ tốt nghiệp."}
            </Typography>
          </article>
        );
      })}
    </div>
  );
}

export function BlueprintEmptyState({
  title,
  description,
  action,
  className,
}: Readonly<{
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}>) {
  return (
    <div className={clsx("surface-blueprint grid place-items-center px-4 py-8 text-center", className)}>
      <VectorBadge variant="spark" className="mb-3" />
      <Typography variant="card-title" className="text-[var(--foreground)]">
        {title}
      </Typography>
      <Typography variant="body-sm" className="mt-2 max-w-2xl text-[var(--muted)]">
        {description}
      </Typography>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
