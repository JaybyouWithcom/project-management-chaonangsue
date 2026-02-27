export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface ApiError {
  success: false;
  error: {
    message: string;
  };
}

export class HttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parseJson(response: Response): Promise<ApiSuccess<unknown> | ApiError> {
  const json = (await response.json()) as ApiSuccess<unknown> | ApiError;
  return json;
}

export async function apiGet<T>(path: string, token?: string): Promise<ApiSuccess<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const payload = await parseJson(response);

  if (!response.ok || !payload.success) {
    throw new HttpError(payload.success ? 'Request failed' : payload.error.message, response.status);
  }

  return payload as ApiSuccess<T>;
}

export async function apiPost<T>(path: string, body: unknown, token?: string): Promise<ApiSuccess<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const payload = await parseJson(response);

  if (!response.ok || !payload.success) {
    throw new HttpError(payload.success ? 'Request failed' : payload.error.message, response.status);
  }

  return payload as ApiSuccess<T>;
}

export const resolveImageUrl = (imagePath: string): string => {
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  return `${API_BASE_URL}${imagePath.startsWith('/') ? imagePath : `/${imagePath}`}`;
};

export async function apiPostForm<T>(path: string, formData: FormData, token?: string): Promise<ApiSuccess<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  const payload = await parseJson(response);

  if (!response.ok || !payload.success) {
    throw new HttpError(payload.success ? 'Request failed' : payload.error.message, response.status);
  }

  return payload as ApiSuccess<T>;
}
