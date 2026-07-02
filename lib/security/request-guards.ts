import type { ZodType } from "zod";

export class PublicRequestError extends Error {
  readonly status: number;
  readonly issues?: string[];

  constructor(status: number, message: string, issues?: string[]) {
    super(message);
    this.name = "PublicRequestError";
    this.status = status;
    this.issues = issues;
  }
}

export async function readJsonStrict<T>(
  request: Request,
  schema: ZodType<T>,
  message: string,
  maxBytes = 24_000,
): Promise<T> {
  const rawBody = await request.text();

  if (rawBody.length > maxBytes) {
    throw new PublicRequestError(413, "Nội dung gửi lên quá lớn. Bạn rút gọn rồi thử lại nhé.");
  }

  let parsed: unknown;

  try {
    parsed = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    throw new PublicRequestError(400, "Nội dung gửi lên chưa đúng định dạng.");
  }

  const result = schema.safeParse(parsed);

  if (!result.success) {
    throw new PublicRequestError(
      400,
      message,
      result.error.issues.map((issue) => issue.message),
    );
  }

  return result.data;
}

function originFromUrl(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function originFromHost(host: string | null, protocol: string) {
  if (!host) {
    return null;
  }

  return originFromUrl(`${protocol}://${host.split(",")[0]?.trim()}`);
}

function addLocalhostAliases(origins: Set<string>) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  for (const origin of Array.from(origins)) {
    try {
      const url = new URL(origin);

      if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
        continue;
      }

      const port = url.port ? `:${url.port}` : "";

      origins.add(`${url.protocol}//localhost${port}`);
      origins.add(`${url.protocol}//127.0.0.1${port}`);
    } catch {
      // Ignore malformed origins collected from defensive header parsing.
    }
  }
}

function trustedRequestOrigins(request: Request) {
  const requestUrl = new URL(request.url);
  const requestProtocol = requestUrl.protocol.replace(":", "");
  const forwardedProtocol =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? requestProtocol;
  const origins = new Set<string>([requestUrl.origin]);
  const hostOrigin = originFromHost(request.headers.get("host"), requestProtocol);
  const forwardedHostOrigin = originFromHost(request.headers.get("x-forwarded-host"), forwardedProtocol);
  const siteOrigin = originFromUrl(process.env.NEXT_PUBLIC_SITE_URL ?? null);

  for (const origin of [hostOrigin, forwardedHostOrigin, siteOrigin]) {
    if (origin) {
      origins.add(origin);
    }
  }

  addLocalhostAliases(origins);

  return origins;
}

export function assertSameOrigin(request: Request) {
  const trustedOrigins = trustedRequestOrigins(request);
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  if (origin && !trustedOrigins.has(origin)) {
    throw new PublicRequestError(403, "Phiên thao tác không hợp lệ. Bạn tải lại trang rồi thử lại nhé.");
  }

  if (!origin && referer) {
    const refererOrigin = originFromUrl(referer);

    if (!refererOrigin || !trustedOrigins.has(refererOrigin)) {
      throw new PublicRequestError(403, "Phiên thao tác không hợp lệ. Bạn tải lại trang rồi thử lại nhé.");
    }
  }

  if (!origin && !referer && process.env.NODE_ENV === "production") {
    throw new PublicRequestError(403, "Phiên thao tác không hợp lệ. Bạn tải lại trang rồi thử lại nhé.");
  }
}
