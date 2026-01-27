// src/lib/client/auth.js
export const getUserInfo = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('userInfo');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const getToken = (userInfo) => userInfo?.token || null;

// ✅ NEW: keep same-tab UI in sync (NavBar / SideBarShell listen to "storage")
export const setUserInfo = (user) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('userInfo', JSON.stringify(user));
    window.dispatchEvent(new Event('storage'));
  } catch {}
};

export const clearUserInfo = () => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('userInfo');
    window.dispatchEvent(new Event('storage'));
  } catch {}
};
