import clsx from "clsx";
import type { HTMLAttributes } from "react";
import type { SurfaceDensity } from "@/lib/visual/types";

export type { SurfaceDensity };

const densityClassName: Record<SurfaceDensity, string> = {
  compact: "rounded-[1rem] px-3 py-3 sm:rounded-[1.5rem] sm:px-4 sm:py-4",
  comfortable: "rounded-[1.15rem] px-3 py-3 sm:rounded-[2rem] sm:px-6 sm:py-6",
  dashboard: "rounded-[1.25rem] px-3 py-3 sm:rounded-[2.15rem] sm:px-7 sm:py-7",
};

export function Card({
  className,
  density = "comfortable",
  ...props
}: HTMLAttributes<HTMLElement> & {
  density?: SurfaceDensity;
}) {
  return (
    <section
      className={clsx(
        "soft-card motion-card",
        densityClassName[density],
        className,
      )}
      {...props}
    />
  );
}
