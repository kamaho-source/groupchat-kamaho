// lib/axios.ts
import axios from 'axios';

// baseURL は /api、呼び出し側は /users のように書く
const normalizeOrigin = (origin?: string) => {
    if (!origin) return undefined;
    const trimmed = origin.replace(/\/$/, '');
    // 誤って末尾に /api を含めた場合に二重化しないように補正
    return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed;
};
const publicBase = process.env.NEXT_PUBLIC_API_BASE || '/api';
const serverBase = normalizeOrigin(process.env.BACKEND_ORIGIN);
const normalizedPublic = publicBase.replace(/\/$/, '');
const baseURL = typeof window === 'undefined'
    ? (serverBase ? `${serverBase.replace(/\/$/, '')}${normalizedPublic}` : normalizedPublic)
    : normalizedPublic;
axios.defaults.baseURL = baseURL;
axios.defaults.withCredentials = true;
axios.defaults.xsrfCookieName = 'XSRF-TOKEN';
axios.defaults.xsrfHeaderName = 'X-XSRF-TOKEN';
axios.defaults.headers.common['Accept'] = 'application/json';

// 認証切れ（401/419）検知 → /login にリダイレクト
axios.interceptors.response.use(
    (res) => res,
    (error) => {
        const status = error?.response?.status;
        if (status === 401 || status === 419) {
            if (typeof window !== 'undefined') {
                const here = window.location.pathname + window.location.search;
                const loginUrl = '/login?redirect=' + encodeURIComponent(here);
                if (window.location.pathname !== '/login') {
                    window.location.href = loginUrl;
                }
            }
        }
        return Promise.reject(error);
    }
);

export default axios;
