// lib/axios.ts
import axios from 'axios';

axios.defaults.baseURL         = '';       // ← Next.js の rewrites 経由で Laravel API にプロキシ
axios.defaults.withCredentials = true;
axios.defaults.xsrfCookieName  = 'XSRF-TOKEN';
axios.defaults.xsrfHeaderName  = 'X-XSRF-TOKEN';
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
