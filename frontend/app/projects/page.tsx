// pages/projects/new.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from '@/lib/axios';

type Project = { id: number; name: string; description: string | null };

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const res = await axios.get('/projects');
            setProjects(res.data);
        } catch {
            setError('プロジェクト一覧の取得に失敗しました');
        }
    };

    return (
        <div className="container mt-5">
            {/* 新規作成ボタン */}
            <Link href="/projects/new" className="btn btn-success mb-4">
                新規プロジェクト作成
            </Link>

            <h2 className="mb-3">登録済みプロジェクト一覧</h2>
            {error && <div className="alert alert-danger">{error}</div>}

            {projects.length === 0 ? (
                <div className="alert alert-info">現在プロジェクトはありません。</div>
            ) : (
                <table className="table table-hover">
                    <thead>
                    <tr>
                        <th>ID</th>
                        <th>名前</th>
                        <th>説明</th>
                    </tr>
                    </thead>
                    <tbody>
                    {projects.map((p) => (
                        <tr key={p.id}>
                            <td>{p.id}</td>
                            <td>
                                <Link href={`/projects/${p.id}`} className="text-decoration-none">
                                    {p.name}
                                </Link>
                            </td>
                            <td>{p.description ?? '—'}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
