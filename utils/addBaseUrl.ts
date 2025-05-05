export const addBaseUrl = (url: string): string => {
  const baseUrl = process.env.BASE_URL;
  if (!baseUrl) {
    throw new Error("BASE_URL is not defined in the environment variables.");
  }

  const normalizedBaseUrl = baseUrl.endsWith("/")
    ? baseUrl.slice(0, -1)
    : baseUrl;
  const normalizedUrl = url.startsWith("/") ? url : `/${url}`;

  return normalizedBaseUrl + normalizedUrl;
};
