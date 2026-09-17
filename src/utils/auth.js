const TOKEN_KEY = 'auth_token';
const LEGACY_TOKEN_KEY = 'token';
const USER_KEY = 'auth_user';

export const getToken = () => {
  const t = localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
  if (!t || t === 'null' || t === 'undefined') return '';
  return t;
};

export const setToken = (token) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(LEGACY_TOKEN_KEY, token);
  } else {
    clearToken();
  }
};

export const getUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY) || localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

export const setUser = (user) => {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem('user', JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('user');
  }
};

export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('user');
};

export const notifySessionExpired = () => {
  clearToken();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('session-expired'));
  }
};

export const authHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const isLoggedIn = () => !!getToken();

/**
 * Global fetch interceptor:
 * 1. Automatically attaches Authorization: Bearer <token> to /api/ requests if not already validly present.
 * 2. Catches 401 Unauthorized responses and notifies session expiration cleanly.
 */
export const setupAuthInterceptor = () => {
  if (typeof window === 'undefined' || window.__authInterceptorInstalled) return;
  window.__authInterceptorInstalled = true;

  const originalFetch = window.fetch;
  window.fetch = async function (input, init = {}) {
    let url = '';
    if (typeof input === 'string') {
      url = input;
    } else if (input && typeof input === 'object' && input.url) {
      url = input.url;
    }

    const isApi = typeof url === 'string' && url.includes('/api/');
    const isLogin = typeof url === 'string' && url.includes('/api/auth/login');

    if (isApi && !isLogin) {
      const token = getToken();
      if (token) {
        init = init || {};
        let headers = init.headers;
        if (!headers) {
          init.headers = { Authorization: `Bearer ${token}` };
        } else if (headers instanceof Headers) {
          const curr = headers.get('Authorization');
          if (!curr || curr === 'Bearer null' || curr === 'Bearer undefined') {
            headers.set('Authorization', `Bearer ${token}`);
          }
        } else if (Array.isArray(headers)) {
          let found = false;
          for (let i = 0; i < headers.length; i++) {
            if (headers[i][0] && headers[i][0].toLowerCase() === 'authorization') {
              found = true;
              if (!headers[i][1] || headers[i][1] === 'Bearer null' || headers[i][1] === 'Bearer undefined') {
                headers[i][1] = `Bearer ${token}`;
              }
            }
          }
          if (!found) {
            headers.push(['Authorization', `Bearer ${token}`]);
          }
        } else if (typeof headers === 'object') {
          const authKey = Object.keys(headers).find(k => k.toLowerCase() === 'authorization');
          if (!authKey || !headers[authKey] || headers[authKey] === 'Bearer null' || headers[authKey] === 'Bearer undefined') {
            init.headers = { ...headers, Authorization: `Bearer ${token}` };
          }
        }
      }
    }

    const response = await originalFetch.call(this, input, init);

    if (response && response.status === 401 && isApi && !isLogin) {
      notifySessionExpired();
    }

    return response;
  };
};

if (typeof window !== 'undefined') {
  setupAuthInterceptor();
}


