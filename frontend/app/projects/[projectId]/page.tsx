'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from '@/lib/axios';

type User = { id: number; name: string };
export default function ProjectUsers() {
    const params = useParams();
    const projectId = Number(params.projectId);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [selected, setSelected] = useState<number[]>([]);
    const [role, setRole] = useState<'member' | 'admin'>('member');
    const [isPublic, setIsPublic] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // 全ユーザー取得
        axios
            .get('/api/users')
            .then(res => {
                const raw = res.data.data ?? res.data;
                let data: User[] = [];
                if (Array.isArray(raw)) {
                    data = raw;
                } else if (raw && typeof raw === 'object' && 'id' in raw) {
                    data = [raw as User];
                }
                if (data.length) {
                    setAllUsers(data);
                } else {
                    console.error('Unexpected /api/users response:', res.data);
                    setError('ユーザーの取得に失敗しました');
                }
            })
            .catch(err => {
                console.error(err);
                setError('ユーザーの取得に失敗しました');
            });

        // プロジェクト既存メンバー取得
        axios
            .get(`/api/projects/${projectId}/users`)
            .then(res => {
                const raw = res.data.data ?? res.data;
                let members: { id: number }[] = [];
                if (Array.isArray(raw)) {
                    members = raw;
                }
                setSelected(members.map(u => u.id));
            })
            .catch(err => {
                console.error(err);
                setError('プロジェクトメンバーの取得に失敗しました');
            });
    }, [projectId]);

    const toggle = (id: number) => {
        setSelected(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const submit = async () => {
        try {
            await axios.post(`/api/projects/${projectId}/users`, {
                user_ids: selected,
                role,
                is_public: isPublic,
            })
            alert('保存に成功しました')
        } catch (err: any) {
            if (err.response?.status === 422) {
                // Laravel の ValidationException が持つ errors オブジェクト
                console.error('Validation Errors:', err.response.data.errors)
                // とりあえずユーザーにわかりやすく文字列化して表示
                const messages = Object.values(err.response.data.errors)
                    .flat()
                    .join('\n')
                setError(messages)
            } else {
                console.error(err)
                setError('メンバーの保存に失敗しました')
            }
        }
    }


    return (
        <div>
            <h3>メンバーを選択</h3>
            {error && <div className="alert alert-danger">{error}</div>}
            <ul className="list-unstyled">
                {allUsers.map(u => (
                    <li key={u.id} className="mb-1">
                        <label className="form-check-label">
                            <input
                                type="checkbox"
                                className="form-check-input me-2"
                                checked={selected.includes(u.id)}
                                onChange={() => toggle(u.id)}
                            />
                            {u.name}
                        </label>
                    </li>
                ))}
            </ul>

            <div className="mb-3">
                <label className="form-label me-2">権限：</label>
                <select
                    value={role}
                    onChange={e => setRole(e.target.value as any)}
                    className="form-select form-select-sm d-inline-block"
                    style={{ width: 'auto' }}
                >
                    <option value="member">メンバー</option>
                    <option value="admin">管理者</option>
                </select>
            </div>

            <div className="form-check mb-3">
                <input
                    id="isPublic"
                    type="checkbox"
                    className="form-check-input me-2"
                    checked={isPublic}
                    onChange={e => setIsPublic(e.target.checked)}
                />
                <label htmlFor="isPublic" className="form-check-label">
                    公開
                </label>
            </div>

            <button className="btn btn-primary" onClick={submit}>
                保存
            </button>
        </div>
    );
}
