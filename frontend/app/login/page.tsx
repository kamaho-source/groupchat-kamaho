'use client';
import React, { useState, useEffect } from 'react';
import { Lock, User as UserIcon } from 'lucide-react';
import axios from '@/lib/axios';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword]     = useState('');
    const [error, setError]           = useState<string | null>(null);
    const [loading, setLoading]       = useState(false);

    // 初回マウント時に CSRF Cookie を取得
    useEffect(() => {
        axios.get('/sanctum/csrf-cookie').catch(console.error);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            // CSRF トークン再取得
            await axios.get('/sanctum/csrf-cookie');
            // ログイン
            await axios.post('api/login', { user_id: identifier, password: password });
            router.replace('/');
        } catch (err: any) {
            if (axios.isAxiosError(err) && err.response) {
                const { status, data } = err.response;
                if (status === 401) {
                    setError('ユーザーIDまたはパスワードが正しくありません');
                } else if (status === 422 && data.errors) {
                    const key = Object.keys(data.errors)[0];
                    setError(data.errors[key][0]);
                } else {
                    setError(data.message || 'ログインに失敗しました');
                }
            } else {
                setError('ネットワークエラーが発生しました');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container vh-100 d-flex justify-content-center align-items-center">
            <form onSubmit={handleSubmit} className="w-100" style={{ maxWidth: 400 }}>
                <h2 className="mb-4 text-center">ログイン</h2>
                {error && <div className="alert alert-danger">{error}</div>}
                <div className="mb-3">
                    <label htmlFor="identifier" className="form-label">ユーザーID</label>
                    <div className="input-group">
                        <span className="input-group-text"><UserIcon size={16} /></span>
                        <input
                            id="identifier"
                            name="user_id"
                            type="text"
                            autoComplete="username"
                            className="form-control"
                            value={identifier}
                            onChange={e => setIdentifier(e.target.value)}
                            required
                        />
                    </div>
                </div>
                <div className="mb-3">
                    <label htmlFor="password" className="form-label">パスワード</label>
                    <div className="input-group">
                        <span className="input-group-text"><Lock size={16} /></span>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            className="form-control"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>
                </div>
                <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                    {loading ? 'ログイン中…' : 'ログイン'}
                </button>
            </form>
        </div>
    );
}
