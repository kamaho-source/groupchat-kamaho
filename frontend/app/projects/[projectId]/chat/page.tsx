'use client'

import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { useParams } from 'next/navigation'
import axios from '@/lib/axios'
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

type Message = {
    id: number
    body: string
    user: { id: number; name: string }
    created_at: string
}

export default function ChatPage() {
    const { projectId } = useParams()
    const [msgs, setMsgs] = useState<Message[]>([])
    const [body, setBody] = useState('')
    const bottom = useRef<HTMLDivElement>(null)

    useEffect(() => {
        axios.get(`/api/projects/${projectId}/chat`).then(res => setMsgs(res.data))

        ;(window as any).Pusher = Pusher
        const echo = new Echo({
            broadcaster: 'pusher',
            key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
        })

        echo.join(`project.${projectId}`)
            .listen('NewProjectMessage', (e: any) => {
                setMsgs(prev => [...prev, e.message])
                bottom.current?.scrollIntoView()
            })

        return () => {
            echo.leave(`project.${projectId}`)
        }
    }, [projectId])

    const send = async () => {
        if (!body.trim()) return
        await axios.post(`/api/projects/${projectId}/chat/send`, { body })
        setBody('')
    }

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') send()
    }

    return (
        <div className="container mt-4 d-flex flex-column" style={{ height: '80vh' }}>
            <h1 className="mb-4">プロジェクトチャット</h1>

            <div className="flex-grow-1 overflow-auto mb-3">
                {msgs.map(m => (
                    <div key={m.id} className="mb-2">
                        <strong>{m.user.name}:</strong> {m.body}
                        <div><small className="text-muted">{new Date(m.created_at).toLocaleTimeString()}</small></div>
                    </div>
                ))}
                <div ref={bottom}></div>
            </div>

            <div className="input-group">
                <input
                    type="text"
                    className="form-control"
                    placeholder="メッセージを入力…"
                    value={body}
                    onChange={e => setBody(e.currentTarget.value)}
                    onKeyDown={onKeyDown}
                />
                <button className="btn btn-primary" onClick={send}>
                    送信
                </button>
            </div>
        </div>
    )
}
