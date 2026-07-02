import clsx from "clsx";
import type { HTMLAttributes } from "react";

export function DropdownPanel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "z-40 rounded-2xl border border-[var(--line)] bg-white p-2 shadow-[0_18px_48px_rgba(0,25,54,0.16)]",
        className,
      )}
      {...props}
    />
  );
}
