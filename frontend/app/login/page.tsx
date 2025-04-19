// app/login/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Lock, User } from 'lucide-react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // CSRF Cookie を取得（Laravel Sanctum 用）
    useEffect(() => {
        axios.get('http://localhost:8080/sanctum/csrf-cookie', { withCredentials: true });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await axios.post(
                'http://localhost:8080/api/login',
                {
                    user_id: identifier, // ← 'id' ではなく 'user_id' を送信
                    password,
                },
                { withCredentials: true }
            );
            router.push('/');
        } catch (err: any) {
            if (err.response?.status === 422 && err.response.data.errors) {
                // バリデーションエラーが返ってきた場合、最初のメッセージを表示
                const firstKey = Object.keys(err.response.data.errors)[0];
                setError(err.response.data.errors[firstKey][0]);
            } else {
                setError(err.response?.data?.message || 'ログインに失敗しました');
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
                        <span className="input-group-text"><User size={16} /></span>
                        <input
                            id="identifier"
                            type="text"
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
                            type="password"
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
