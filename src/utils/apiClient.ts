const API_KEY_STORAGE_KEY = 'edd_api_key';

export const getApiKey = () => {
  return localStorage.getItem(API_KEY_STORAGE_KEY) || import.meta.env.VITE_API_KEY || '';
};

export const setApiKey = (key: string) => {
  localStorage.setItem(API_KEY_STORAGE_KEY, key);
};

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const apiKey = getApiKey();
  
  const headers = new Headers(options.headers || {});
  if (apiKey) {
    headers.set('X-API-Key', apiKey);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    throw new Error('Unauthorized: Invalid API Key');
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'API Request failed');
  }

  return response;
}

export async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiFetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  return await response.json() as { url: string; filename: string };
}
