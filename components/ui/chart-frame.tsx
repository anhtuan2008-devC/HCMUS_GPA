import clsx from "clsx";
import type { HTMLAttributes, ReactNode } from "react";

export function ChartFrame({
  title,
  description,
  action,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement> & {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <section
      className={clsx(
        "rounded-[1.25rem] border border-[var(--line)] bg-white/70 p-3 sm:rounded-[1.75rem] sm:p-4",
        className,
      )}
      {...props}
    >
      <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-[var(--foreground)] sm:text-lg" title={title}>
            {title}
          </h3>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-[var(--muted)] sm:text-sm">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
