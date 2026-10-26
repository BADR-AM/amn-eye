const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

if (typeof window !== 'undefined' && window.localStorage) {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem('token');
    window.localStorage.removeItem(USER_KEY);
    window.localStorage.removeItem('user');
  } catch (_) {}
}

export function getToken() {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(TOKEN_KEY) || window.sessionStorage.getItem('token');
}

export function setToken(token) {
  if (typeof window === 'undefined') return;
  if (token) {
    window.sessionStorage.setItem(TOKEN_KEY, token);
  } else {
    clearToken();
  }
}

export function clearToken() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem('token');
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem('token');
}

export function getUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(USER_KEY) || window.sessionStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setUser(user) {
  if (typeof window === 'undefined') return;
  if (user) {
    window.sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    removeUser();
  }
}

export function removeUser() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(USER_KEY);
  window.sessionStorage.removeItem('user');
  window.localStorage.removeItem(USER_KEY);
  window.localStorage.removeItem('user');
}

export function authHeaders(extra = {}) {
  const token = getToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : { ...extra };
}

export const isLoggedIn = () => !!getToken();

export const notifySessionExpired = () => {
  clearToken();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('session-expired'));
  }
};

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
    const isLogin = typeof url === 'string' && (url.includes('/api/auth/login') || url.includes('/api/auth/qr-login'));

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
