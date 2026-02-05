const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

export async function apiFetch(path: string, options?: RequestInit) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || '요청 실패');
  }

  return res.json();
}

export async function apiUpload(path: string, file: File) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || '업로드 실패');
  }

  return res.json();
}
