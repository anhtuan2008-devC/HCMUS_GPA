import clsx from "clsx";
import type { HTMLAttributes } from "react";

export function Toast({
  className,
  tone = "success",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  tone?: "success" | "error";
}) {
  return (
    <div
      className={clsx(
        "motion-card fixed bottom-5 right-5 z-50 max-w-sm rounded-[1.5rem] border px-5 py-4 text-sm shadow-[0_20px_60px_rgba(0,25,54,0.18)]",
        tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-rose-200 bg-rose-50 text-rose-700",
        className,
      )}
      role="status"
      {...props}
    />
  );
}
