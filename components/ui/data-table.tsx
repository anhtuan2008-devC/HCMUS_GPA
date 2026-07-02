import clsx from "clsx";
import type { HTMLAttributes, ReactNode } from "react";

export function DataTable({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx("overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-white/72", className)}
      {...props}
    />
  );
}

export function DataTableHeader({
  className,
  children,
}: Readonly<{
  className?: string;
  children: ReactNode;
}>) {
  return (
    <div
      className={clsx(
        "hidden gap-3 border-b border-[var(--line)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)] md:grid",
        className,
      )}
    >
      {children}
    </div>
  );
}
