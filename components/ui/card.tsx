import clsx from "clsx";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={clsx(
        "soft-card motion-card rounded-[2rem] px-5 py-5 sm:px-6 sm:py-6",
        className,
      )}
      {...props}
    />
  );
}
