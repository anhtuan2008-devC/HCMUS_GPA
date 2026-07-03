import { AlertCircle, ChevronDown, X } from "lucide-react";
import { IconBadge } from "@/components/workspace/ui";
import type { GradesPageKey, NotificationItem } from "@/lib/types";

export function NotificationDropdown({
  isOpen,
  notifications,
  activeGradesPage,
  dropdownRef,
  onClose,
  onSelect,
}: Readonly<{
  isOpen: boolean;
  notifications: NotificationItem[];
  activeGradesPage: GradesPageKey;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onSelect: (item: NotificationItem, fallbackGradesPage: GradesPageKey) => void;
}>) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={dropdownRef}
      className="mobile-dropdown-panel fixed right-2 top-[4.25rem] z-50 flex max-h-[min(22rem,calc(100vh-6rem))] w-[min(19rem,calc(100vw-1rem))] flex-col rounded-[1.35rem] border border-white/80 bg-[var(--surface)] p-3 shadow-[0_18px_58px_rgba(0,25,54,0.18)] lg:right-5 lg:top-24 lg:max-h-[min(38.75rem,calc(100vh-7rem))] lg:w-[min(26.875rem,calc(100vw-1.5rem))] lg:rounded-[2rem] lg:p-5 lg:shadow-[0_24px_80px_rgba(0,25,54,0.2)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] lg:text-sm lg:tracking-[0.2em]">
            Trung tâm cảnh báo
          </p>
          <h3 className="mt-1 text-base font-semibold text-[var(--foreground)] lg:mt-2 lg:text-2xl">
            Những việc nên để mắt hôm nay
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="hidden h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--muted)] transition hover:text-[var(--brand-primary)] lg:inline-flex"
          aria-label="Đóng trung tâm cảnh báo"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="scrollbar-subtle mt-3 space-y-2 overflow-y-auto pr-1 lg:mt-5 lg:space-y-3">
        {notifications.map((item) => (
          <article
            key={item.id}
            className="rounded-[1rem] border border-[var(--line)] bg-white/82 px-3 py-3 lg:rounded-[1.5rem] lg:px-4 lg:py-4"
          >
            <div className="flex gap-3">
              <IconBadge
                tone={
                  item.tone === "danger"
                    ? "danger"
                    : item.tone === "success"
                      ? "success"
                      : item.tone === "warning"
                        ? "orange"
                        : "brand"
                }
              >
                <AlertCircle className="h-4 w-4 lg:h-5 lg:w-5" />
              </IconBadge>
              <div>
                <h4 className="text-sm font-semibold text-[var(--foreground)] lg:text-base">{item.title}</h4>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)] lg:text-sm lg:leading-6">
                  {item.description}
                </p>
                <button
                  type="button"
                  onClick={() => onSelect(item, activeGradesPage)}
                  className="mt-2 inline-flex min-h-8 items-center gap-1.5 rounded-full bg-[var(--surface-tint)] px-2.5 py-1.5 text-[0.68rem] font-semibold text-[var(--brand-primary)] transition hover:bg-blue-100 lg:mt-3 lg:min-h-9 lg:gap-2 lg:px-3 lg:py-2 lg:text-xs"
                >
                  {item.actionLabel}
                  <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
