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
      className="motion-card fixed right-3 top-24 z-50 flex max-h-[min(38.75rem,calc(100vh-7rem))] w-[min(26.875rem,calc(100vw-1.5rem))] flex-col rounded-[2rem] border border-white/80 bg-[var(--surface)] p-5 shadow-[0_24px_80px_rgba(0,25,54,0.2)] sm:right-5 lg:top-24"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Trung tâm cảnh báo
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
            Những việc nên để mắt hôm nay
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--muted)] transition hover:text-[var(--brand-primary)]"
          aria-label="Đóng trung tâm cảnh báo"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="scrollbar-subtle mt-5 space-y-3 overflow-y-auto pr-1">
        {notifications.map((item) => (
          <article
            key={item.id}
            className="rounded-[1.5rem] border border-[var(--line)] bg-white/82 px-4 py-4"
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
                <AlertCircle className="h-5 w-5" />
              </IconBadge>
              <div>
                <h4 className="font-semibold text-[var(--foreground)]">{item.title}</h4>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{item.description}</p>
                <button
                  type="button"
                  onClick={() => onSelect(item, activeGradesPage)}
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-[var(--surface-tint)] px-3 py-2 text-xs font-semibold text-[var(--brand-primary)] transition hover:bg-blue-100"
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
