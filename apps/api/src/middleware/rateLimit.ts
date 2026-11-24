import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../app";

export interface RateLimiterOptions {
  windowMs: number;
  max: number;
  keyPrefix: string;
  methods?: string[];
}

export function createRateLimiter(
  options: RateLimiterOptions
): MiddlewareHandler<AppEnv> {
  const store = new Map<string, { count: number; resetAt: number }>();

  return async (c, next) => {
    if (options.methods && !options.methods.includes(c.req.method)) {
      await next();
      return;
    }

    const rawIp =
      c.req.header("cf-connecting-ip") ||
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      c.req.header("x-real-ip") ||
      "unknown";
    const key = `${options.keyPrefix}:${rawIp}`;
    const now = Date.now();

    if (store.size > 2000) {
      for (const [k, entry] of store.entries()) {
        if (entry.resetAt <= now) {
          store.delete(k);
        }
      }
    }

    let entry = store.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = {
        count: 1,
        resetAt: now + options.windowMs,
      };
      store.set(key, entry);
      await next();
      return;
    }

    entry.count += 1;
    if (entry.count > options.max) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((entry.resetAt - now) / 1000)
      );
      c.header("Retry-After", String(retryAfterSeconds));
      return c.json(
        {
          error: {
            code: "RATE_LIMITED",
            message:
              "Terlalu banyak permintaan. Coba lagi beberapa saat lagi.",
          },
        },
        429
      );
    }

    await next();
  };
}
