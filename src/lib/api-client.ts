// Browser-side helper for calling the API routes in src/app/api.

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = "ApiClientError"
  }

  get isPlanRestriction() {
    return this.code === "PLAN_LIMIT_REACHED" || this.code === "PLAN_FEATURE_UNAVAILABLE"
  }
}

export async function apiFetch<T>(
  path: string,
  options: { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown } = {}
): Promise<{ data: T; message: string }> {
  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers: options.body === undefined ? undefined : { "Content-Type": "application/json" },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  const json = await response.json().catch(() => null)
  if (!response.ok || !json || json.error) {
    throw new ApiClientError(
      json?.message ?? "Something went wrong",
      json?.error ?? "INTERNAL_ERROR",
      response.status,
      json?.details
    )
  }
  return { data: json.data as T, message: json.message }
}
