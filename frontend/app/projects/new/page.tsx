// app/projects/new/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from '@/lib/axios'

type Channel = { id: number; name: string }

export default function NewProject() {
    const router = useRouter()
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [channelId, setChannelId] = useState<number | ''>('')
    const [channels, setChannels] = useState<Channel[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // 既存チャンネル一覧を取得
    useEffect(() => {
        axios
            .get('/api/channels')
            .then(res => setChannels(res.data))
            .catch(() => setError('チャンネルの取得に失敗しました'))
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)
        try {
            await axios.post('/api/projects', {
                name,
                description,
                channel_id: channelId,
            })
            // 作成後に一覧ページへ遷移
            router.push('/projects')
        } catch (err: any) {
            console.error(err)
            setError(err.response?.data?.message || 'プロジェクトの作成に失敗しました')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-xl mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">新規プロジェクト作成</h1>
            {error && <p className="text-red-600 mb-2">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block mb-1">プロジェクト名</label>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.currentTarget.value)}
                        className="w-full border rounded p-2"
                        required
                    />
                </div>
                <div>
                    <label className="block mb-1">説明</label>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.currentTarget.value)}
                        className="w-full border rounded p-2"
                    />
                </div>
                <div>
                    <label className="block mb-1">チャンネル選択</label>
                    <select
                        value={channelId}
                        onChange={e => setChannelId(Number(e.currentTarget.value))}
                        className="w-full border rounded p-2"
                        required
                    >
                        <option value="">-- 選択してください --</option>
                        {channels.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                >
                    {loading ? '作成中…' : '作成'}
                </button>
            </form>
        </div>
    )
}
