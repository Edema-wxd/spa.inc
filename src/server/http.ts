import { NextResponse } from "next/server"
import { z, ZodError, type ZodType } from "zod"
import { ApiError } from "@/server/errors"

/**
 * Every API response uses the same envelope:
 *   success: { data, error: null, message }
 *   failure: { data: null, error: <code>, message, details? }
 */
export interface ApiResponse<T> {
  data: T | null
  error: string | null
  message: string
  details?: unknown
}

export function ok<T>(data: T, message = "OK", status = 200) {
  return NextResponse.json<ApiResponse<T>>({ data, error: null, message }, { status })
}

export function created<T>(data: T, message = "Created") {
  return ok(data, message, 201)
}

function fail(error: ApiError) {
  return NextResponse.json<ApiResponse<never>>(
    { data: null, error: error.code, message: error.message, details: error.details },
    { status: error.status }
  )
}

export async function parseBody<S extends ZodType>(request: Request, schema: S): Promise<z.output<S>> {
  let json: unknown
  try {
    json = await request.json()
  } catch {
    throw new ApiError(400, "BAD_REQUEST", "Request body must be valid JSON")
  }
  return schema.parse(json)
}

export function parseQuery<S extends ZodType>(request: Request, schema: S): z.output<S> {
  const params = Object.fromEntries(new URL(request.url).searchParams)
  return schema.parse(params)
}

type RouteContext<P> = { params: Promise<P> }

/** Wraps a route handler with consistent error handling. */
export function route<P = Record<string, string>>(
  handler: (request: Request, context: RouteContext<P>) => Promise<Response>
) {
  return async (request: Request, context: RouteContext<P>) => {
    try {
      return await handler(request, context)
    } catch (err) {
      if (err instanceof ApiError) return fail(err)
      if (err instanceof ZodError) {
        return fail(
          new ApiError(422, "VALIDATION_ERROR", "Some fields are invalid", z.flattenError(err).fieldErrors)
        )
      }
      console.error("[api] unhandled error", err)
      return fail(new ApiError(500, "INTERNAL_ERROR", "Something went wrong"))
    }
  }
}
