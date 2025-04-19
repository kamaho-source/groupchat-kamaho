'use client';

import { useState, useEffect } from 'react';
import { UserPlus, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

export default function UserCreatePage() {
    const router = useRouter();
    const [userId, setUserId] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // マウント時に CSRF Cookie を取得
    useEffect(() => {
        axios.get('http://localhost:8080/sanctum/csrf-cookie', {
            withCredentials: true
        }).catch(console.error);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== passwordConfirm) {
            setError('パスワードが一致しません');
            return;
        }

        setLoading(true);
        try {
            await axios.post(
                'http://localhost:8080/api/register',
                {
                    user_id: userId,
                    name,
                    password,
                    password_confirmation: passwordConfirm,
                },
                { withCredentials: true }
            );
            router.push('/');
        } catch (err: any) {
            // Laravel の Validation エラー等を拾えるように
            const msg =
                err.response?.data?.message ||
                err.response?.data?.errors?.[0] ||
                'ユーザー作成に失敗しました';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container py-5" style={{ maxWidth: 500 }}>
            <h2 className="mb-4">
                <UserPlus size={20} className="me-2" />
                新規ユーザー作成
            </h2>

            {error && <div className="alert alert-danger">{error}</div>}

            <form onSubmit={handleSubmit}>
                <div className="mb-3">
                    <label htmlFor="userId" className="form-label">
                        ユーザーID
                    </label>
                    <input
                        id="userId"
                        type="text"
                        className="form-control"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        required
                    />
                </div>

                <div className="mb-3">
                    <label htmlFor="name" className="form-label">
                        名前
                    </label>
                    <input
                        id="name"
                        type="text"
                        className="form-control"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>

                {/* パスワード */}
                <div className="mb-3">
                    <label htmlFor="password" className="form-label">
                        パスワード
                    </label>
                    <div className="input-group">
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            className="form-control"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <span
                            className="input-group-text"
                            style={{ cursor: 'pointer' }}
                            onClick={() => setShowPassword((v) => !v)}
                        >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </span>
                    </div>
                </div>

                {/* パスワード（確認） */}
                <div className="mb-3">
                    <label htmlFor="passwordConfirm" className="form-label">
                        パスワード（確認）
                    </label>
                    <div className="input-group">
                        <input
                            id="passwordConfirm"
                            type={showConfirm ? 'text' : 'password'}
                            className="form-control"
                            value={passwordConfirm}
                            onChange={(e) => setPasswordConfirm(e.target.value)}
                            required
                        />
                        <span
                            className="input-group-text"
                            style={{ cursor: 'pointer' }}
                            onClick={() => setShowConfirm((v) => !v)}
                        >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </span>
                    </div>
                </div>

                <button type="submit" className="btn btn-success w-100" disabled={loading}>
                    {loading ? '保存中…' : 'ユーザー作成'}
                </button>
            </form>
        </div>
    );
}
