import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { PublicRequestError } from "@/lib/security/request-guards";

export const privateNoStoreHeaders = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
} as const;

export function noStoreHeaders(extra?: HeadersInit): HeadersInit {
  return {
    ...privateNoStoreHeaders,
    ...extra,
  };
}

export function jsonOk<T>(body: T, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: noStoreHeaders(init?.headers),
  });
}

export function jsonError(message: string, status = 500, issues?: string[]) {
  return NextResponse.json(
    {
      message,
      ...(issues ? { issues } : {}),
    },
    {
      status,
      headers: noStoreHeaders(),
    },
  );
}

export function jsonUnauthorized(message = "Bạn cần đăng nhập để tiếp tục.") {
  return jsonError(message, 401);
}

export function errorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof PublicRequestError) {
    return jsonError(error.message, error.status, error.issues);
  }

  if (error instanceof ZodError) {
    return jsonError(
      fallbackMessage,
      400,
      error.issues.map((issue) => issue.message),
    );
  }

  return jsonError(fallbackMessage, 500);
}
