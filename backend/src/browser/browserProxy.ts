export interface BrowserProxyConfig {
  server: string;
  username?: string;
  password?: string;
}

/**
 * Reads the browser proxy configuration from environment variables.
 *
 * Supported:
 *   http://host:port
 *   https://host:port
 *   socks5://host:port
 *
 * Authentication is optional.
 */
export function getBrowserProxyConfig():
  | BrowserProxyConfig
  | undefined {
  const server =
    process.env.BROWSER_PROXY_URL?.trim();

  if (!server) {
    return undefined;
  }

  const username =
    process.env.BROWSER_PROXY_USERNAME?.trim();

  const password =
    process.env.BROWSER_PROXY_PASSWORD?.trim();

  return {
    server,
    ...(username
      ? { username }
      : {}),
    ...(password
      ? { password }
      : {}),
  };
}
