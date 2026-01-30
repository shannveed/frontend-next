// frontend-next/src/lib/client/apiFetch.js
export async function apiFetch(
  path,
  {
    method = "GET",
    token = null,
    body = null,
    headers = {},
    cache = method.toUpperCase() === "GET" ? "no-store" : "no-store",
    bustCache = false,
    signal,
  } = {}
) {
  let url = path;

  // Optional cache-buster (off by default)
  if (bustCache && method.toUpperCase() === "GET") {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://www.moviefrost.com";
    const u = new URL(url, origin);
    u.searchParams.set("_t", String(Date.now()));
    url = u.pathname + u.search;
  }

  const res = await fetch(url, {
    method,
    cache,

    // ✅ IMPORTANT for SSR cookie auth
    credentials: "include",

    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  if (res.status === 204) return null;

  const text = await res.text().catch(() => "");
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg =
      data?.message ||
      (typeof data === "string" && data) ||
      res.statusText ||
      "Request failed";
    throw new Error(msg);
  }

  return data;
}
