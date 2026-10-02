function readCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp(
      `(?:^|; )${name}=([^;]*)`
    )
  );

  return match
    ? decodeURIComponent(match[1])
    : null;
}

let csrfPromise: Promise<void> | null = null;

async function ensureCsrfToken(): Promise<void> {
  if (readCookie('avc.csrf')) {
    return;
  }

  if (!csrfPromise) {
    csrfPromise = fetch(
      '/api/auth/csrf',
      {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      }
    )
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(
            'Unable to initialize security token.'
          );
        }

        /*
         * The browser stores the Set-Cookie response
         * automatically. The value is readable because
         * avc.csrf is intentionally not HttpOnly.
         */
        await res.json().catch(() => undefined);
      })
      .finally(() => {
        csrfPromise = null;
      });
  }

  await csrfPromise;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (
    options.method ?? 'GET'
  ).toUpperCase();

  const headers = new Headers(
    options.headers
  );

  if (
    options.body &&
    !(options.body instanceof FormData)
  ) {
    headers.set(
      'Content-Type',
      'application/json'
    );
  }

  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(method)
  ) {
    await ensureCsrfToken();

    const csrf = readCookie(
      'avc.csrf'
    );

    if (csrf) {
      headers.set(
        'x-csrf-token',
        csrf
      );
    }
  }

  const res = await fetch(
    `/api${path}`,
    {
      ...options,
      method,
      headers,
      credentials: 'include',
    }
  );

  if (res.status === 204) {
    return undefined as T;
  }

  const isJson =
    res.headers
      .get('content-type')
      ?.includes(
        'application/json'
      );

  const body = isJson
    ? await res
        .json()
        .catch(() => ({}))
    : undefined;

  if (!res.ok) {
    const err =
      body?.error ?? {
        code: 'unknown',
        message:
          'Something went wrong.',
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

  post: <T>(
    path: string,
    body?: unknown
  ) =>
    request<T>(
      path,
      {
        method: 'POST',
        body:
          body !== undefined
            ? JSON.stringify(body)
            : undefined,
      }
    ),

  patch: <T>(
    path: string,
    body?: unknown
  ) =>
    request<T>(
      path,
      {
        method: 'PATCH',
        body:
          body !== undefined
            ? JSON.stringify(body)
            : undefined,
      }
    ),

  delete: <T>(path: string) =>
    request<T>(
      path,
      {
        method: 'DELETE',
      }
    ),

  upload: <T>(
    path: string,
    formData: FormData
  ) =>
    request<T>(
      path,
      {
        method: 'POST',
        body: formData,
      }
    ),
};
