// lib/axios.ts
import axios from 'axios';

axios.defaults.baseURL         = '';       // ← Next.js の rewrites 経由で Laravel API にプロキシ
axios.defaults.withCredentials = true;
axios.defaults.xsrfCookieName  = 'XSRF-TOKEN';
axios.defaults.xsrfHeaderName  = 'X-XSRF-TOKEN';
axios.defaults.headers.common['Accept'] = 'application/json';

export default axios;
