import clsx from "clsx";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={clsx(
        "soft-card motion-card rounded-[1.15rem] px-3 py-3 sm:rounded-[2rem] sm:px-6 sm:py-6",
        className,
      )}
      {...props}
    />
  );
}
