type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status?: number };

/** Calls one of Compound's own API routes, turning any failure into a user-facing message. */
export async function apiRequest<T>(
  url: string,
  fallbackError: string,
  { method = "GET", body }: { method?: string; body?: unknown } = {},
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      cache: "no-store",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return res.ok
      ? { ok: true, data: data as T }
      : { ok: false, error: data.error ?? fallbackError, status: res.status };
  } catch {
    return { ok: false, error: fallbackError };
  }
}
