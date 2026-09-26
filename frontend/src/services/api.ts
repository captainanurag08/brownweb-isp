function readCookie(name: string): string | null {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${escapedName}=([^;]*)`)
  );

  return match ? decodeURIComponent(match[1]) : null;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Ensures that the browser has a CSRF cookie before making
 * a state-changing API request.
 *
 * The backend exposes GET /api/auth/csrf specifically for
 * bootstrapping the CSRF protection before login/register.
 */
let csrfPromise: Promise<void> | null = null;

async function ensureCsrfToken(): Promise<void> {
  if (readCookie('avc.csrf')) {
    return;
  }

  if (!csrfPromise) {
    csrfPromise = fetch('/api/auth/csrf', {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new ApiError(
            res.status,
            'csrf_init_failed',
            'Unable to initialize security protection.'
          );
        }

        // Consume the response so the request is fully completed.
        await res.json().catch(() => undefined);

        if (!readCookie('avc.csrf')) {
          throw new ApiError(
            500,
            'csrf_cookie_missing',
            'Security cookie was not created.'
          );
        }
      })
      .finally(() => {
        csrfPromise = null;
      });
  }

  await csrfPromise;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();

  const headers = new Headers(options.headers);

  if (
    options.body &&
    !(options.body instanceof FormData)
  ) {
    headers.set('Content-Type', 'application/json');
  }

  const isSafeMethod = ['GET', 'HEAD', 'OPTIONS'].includes(method);

  if (!isSafeMethod) {
    await ensureCsrfToken();

    const csrf = readCookie('avc.csrf');

    if (!csrf) {
      throw new ApiError(
        403,
        'csrf_missing',
        'Security token is missing. Please refresh and try again.'
      );
    }

    headers.set('x-csrf-token', csrf);
  }

  const res = await fetch(`/api${path}`, {
    ...options,
    method,
    headers,
    credentials: 'include',
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const isJson = res.headers
    .get('content-type')
    ?.includes('application/json');

  const body = isJson
    ? await res.json().catch(() => ({}))
    : undefined;

  if (!res.ok) {
    const err = body?.error ?? {
      code: 'unknown',
      message: 'Something went wrong.',
    };

    throw new ApiError(
      res.status,
      err.code,
      err.message
    );
  }

  return body as T;
}

export const api = {
  get: <T>(path: string) =>
    request<T>(path),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body:
        body !== undefined
          ? JSON.stringify(body)
          : undefined,
    }),

  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body:
        body !== undefined
          ? JSON.stringify(body)
          : undefined,
    }),

  delete: <T>(path: string) =>
    request<T>(path, {
      method: 'DELETE',
    }),

  upload: <T>(
    path: string,
    formData: FormData
  ) =>
    request<T>(path, {
      method: 'POST',
      body: formData,
    }),
};
