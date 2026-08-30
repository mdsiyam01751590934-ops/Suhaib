/**
 * Centralized API Client with JWT Bearer Token and Credentials
 */

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = localStorage.getItem('unlim_token');
  const headers = new Headers(init?.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const customInit: RequestInit = {
    ...init,
    headers,
    credentials: init?.credentials || 'include',
  };

  return fetch(input, customInit);
}

/**
 * Generates an authenticated file viewing / streaming / download URL
 * incorporating the active user token for standard <img>, <video>, <audio>, and <a> tags.
 */
export function getFileUrl(fileId: string | number, action: 'view' | 'download' | 'thumbnail' | 'stream' = 'view'): string {
  const token = localStorage.getItem('unlim_token');
  const basePath = `/api/files/${fileId}/${action}`;
  if (token) {
    return `${basePath}?token=${encodeURIComponent(token)}`;
  }
  return basePath;
}

export function sanitizePhoneNumber(input: string, defaultCountryCode = '+880'): string {
  if (!input) return '';
  let cleaned = input.trim().replace(/[\s\-\(\)]/g, '');

  // If starts with 00, convert to +
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
  }

  // If starts with 01 (local Bangladesh mobile number format: 013, 014, 015, 016, 017, 018, 019)
  if (/^01[3-9]\d{8}$/.test(cleaned)) {
    cleaned = '+880' + cleaned.slice(1);
  }

  // If user entered +88001... (extra 0 after 880)
  if (cleaned.startsWith('+88001')) {
    cleaned = '+8801' + cleaned.slice(6);
  } else if (cleaned.startsWith('88001')) {
    cleaned = '+8801' + cleaned.slice(5);
  } else if (cleaned.startsWith('8801') && !cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }

  // If no plus sign, and doesn't have country code, apply default
  if (!cleaned.startsWith('+')) {
    if (cleaned.startsWith('0')) {
      cleaned = defaultCountryCode + cleaned.slice(1);
    } else {
      cleaned = defaultCountryCode + cleaned;
    }
  }

  return cleaned;
}
