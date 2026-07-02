import { DEFAULT_APP_PATH } from "@/lib/app-routes";

export function safeRedirectPath(value: string | null | undefined, fallback = DEFAULT_APP_PATH) {
  if (!value) {
    return fallback;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  try {
    const parsed = new URL(value, "http://hcmus-gpa.local");

    if (parsed.origin !== "http://hcmus-gpa.local") {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
