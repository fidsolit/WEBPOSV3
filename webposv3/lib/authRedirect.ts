export function getAuthRedirectURL(path = "/auth/login") {
  let url =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_VERCEL_URL ??
    "http://localhost:3000";

  if (!url.startsWith("http")) {
    url = `https://${url}`;
  }

  url = url.endsWith("/") ? url.slice(0, -1) : url;

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${url}${normalizedPath}`;
}
