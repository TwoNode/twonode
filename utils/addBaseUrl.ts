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

// New function specifically for Paystack callback URLs
export const getPaystackCallbackUrl = (url: string): string => {
  // For Paystack callbacks, we need to use the production URL even in development
  // because Paystack needs to reach our webhook endpoints
  const callbackBaseUrl = process.env.BASE_URL || process.env.ONLINE_BASE_URL;

  if (!callbackBaseUrl) {
    throw new Error(
      "ONLINE_BASE_URL or BASE_URL is not defined in the environment variables."
    );
  }

  const normalizedBaseUrl = callbackBaseUrl.endsWith("/")
    ? callbackBaseUrl.slice(0, -1)
    : callbackBaseUrl;

  const normalizedUrl = url.startsWith("/") ? url : `/${url}`;

  return normalizedBaseUrl + normalizedUrl;
};
