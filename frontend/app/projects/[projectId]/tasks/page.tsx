'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useParams } from 'next/navigation'
import axios from '@/lib/axios'

type Task = {
    id: number
    title: string
    description?: string
    status: 'todo' | 'doing' | 'done'
    start_at?: string
    end_at?: string
    assignee?: { id: number; name: string }
}

type User = { id: number; name: string }

export default function TasksPage() {
    const { projectId } = useParams()
    const [tasks, setTasks] = useState<Task[]>([])
    const [users, setUsers] = useState<User[]>([])
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [startAt, setStartAt] = useState('')
    const [endAt, setEndAt] = useState('')
    const [assigneeId, setAssigneeId] = useState<number | ''>('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        fetchTasks()
        fetchUsers()
    }, [projectId])

    const fetchTasks = async () => {
        try {
            const res = await axios.get(`/api/projects/${projectId}/tasks`)
            setTasks(res.data)
        } catch (err) {
            console.error(err)
        }
    }

    const fetchUsers = async () => {
        try {
            const res = await axios.get(`/api/projects/${projectId}/users`)
            setUsers(res.data)
        } catch (err) {
            console.error(err)
        }
    }

    const handleCreate = async (e: FormEvent) => {
        e.preventDefault()
        if (!title.trim()) return
        setLoading(true)
        try {
            await axios.post(`/api/projects/${projectId}/tasks`, {
                title,
                description,
                start_at: startAt || null,
                end_at: endAt || null,
                assignee_id: assigneeId || null,
            })
            await fetchTasks()
        } catch (err) {
            console.error(err)
        }
        setTitle('')
        setDescription('')
        setStartAt('')
        setEndAt('')
        setAssigneeId('')
        setLoading(false)
    }

    const handleUpdateStatus = async (id: number, newStatus: Task['status']) => {
        try {
            await axios.patch(`/api/projects/${projectId}/tasks/${id}`, { status: newStatus })
            await fetchTasks()
        } catch (err) {
            console.error(err)
        }
    }

    const moveTask = (id: number, direction: 'prev' | 'next') => {
        const order: Task['status'][] = ['todo','doing','done']
        const task = tasks.find(t => t.id === id)
        if (!task) return
        const idx = order.indexOf(task.status)
        const newIdx = direction === 'prev' ? idx - 1 : idx + 1
        if (newIdx < 0 || newIdx >= order.length) return
        handleUpdateStatus(id, order[newIdx])
    }

    const statusConfig = {
        todo:  { label: '未着手', color: 'primary' },
        doing: { label: '進行中', color: 'warning' },
        done:  { label: '完了', color: 'success' },
    } as const

    return (
        <div className="container mt-5">
            <h1 className="mb-4">タスク管理</h1>

            {/* タスク追加フォーム */}
            <form onSubmit={handleCreate} className="card p-3 mb-5">
                <div className="row g-3 align-items-end">
                    <div className="col-md-3">
                        <label className="form-label">タイトル</label>
                        <input
                            type="text"
                            placeholder="タスクタイトル"
                            value={title}
                            onChange={e => setTitle(e.currentTarget.value)}
                            className="form-control"
                            required
                        />
                    </div>
                    <div className="col-md-2">
                        <label className="form-label">開始日</label>
                        <input
                            type="date"
                            value={startAt}
                            onChange={e => setStartAt(e.currentTarget.value)}
                            className="form-control"
                        />
                    </div>
                    <div className="col-md-2">
                        <label className="form-label">終了日</label>
                        <input
                            type="date"
                            value={endAt}
                            onChange={e => setEndAt(e.currentTarget.value)}
                            className="form-control"
                        />
                    </div>
                    <div className="col-md-3">
                        <label className="form-label">担当者</label>
                        <select
                            className="form-select"
                            value={assigneeId}
                            onChange={e => setAssigneeId(Number(e.currentTarget.value) || '')}
                        >
                            <option value="">未設定</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-2 text-end">
                        <button type="submit" className="btn btn-success" disabled={loading}>
                            {loading ? '作成中…' : 'タスク追加'}
                        </button>
                    </div>
                    <div className="col-12 mt-2">
                        <label className="form-label">詳細（任意）</label>
                        <textarea
                            rows={2}
                            placeholder="説明を入力"
                            value={description}
                            onChange={e => setDescription(e.currentTarget.value)}
                            className="form-control"
                        />
                    </div>
                </div>
            </form>

            {/* バックログ風カンバン */}
            <div className="row gx-3">
                {Object.entries(statusConfig).map(([key, cfg]) => (
                    <div key={key} className="col-md-4 mb-4">
                        <div className={`card border-${cfg.color}`}>
                            <div className={`card-header bg-${cfg.color} text-white d-flex justify-content-between align-items-center`}>
                                {cfg.label}
                                <span className="badge bg-light text-dark">
                  {tasks.filter(t => t.status === key).length}
                </span>
                            </div>
                            <div className="card-body p-2" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                                {tasks
                                    .filter(t => t.status === key)
                                    .map(task => (
                                        <div key={task.id} className="card mb-2 shadow-sm">
                                            <div className="card-body p-2">
                                                <div className="d-flex justify-content-between">
                                                    <h6 className="card-title mb-1">{task.title}</h6>
                                                    {task.assignee && <small className="text-muted">▶ {task.assignee.name}</small>}
                                                </div>
                                                {(task.start_at || task.end_at) && (
                                                    <div className="mb-1">
                                                        {task.start_at && (
                                                            <span className="badge bg-info me-1">
                                開始: {new Date(task.start_at).toLocaleDateString()}
                              </span>
                                                        )}
                                                        {task.end_at && (
                                                            <span className="badge bg-secondary">
                                終了: {new Date(task.end_at).toLocaleDateString()}
                              </span>
                                                        )}
                                                    </div>
                                                )}
                                                {task.description && <p className="mb-1">{task.description}</p>}
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <div className="btn-group" role="group">
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-secondary"
                                                            onClick={() => moveTask(task.id, 'prev')}
                                                        >←</button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-secondary"
                                                            onClick={() => moveTask(task.id, 'next')}
                                                        >→</button>
                                                    </div>
                                                    <select
                                                        value={task.status}
                                                        onChange={e => handleUpdateStatus(task.id, e.currentTarget.value as any)}
                                                        className="form-select form-select-sm w-auto"
                                                    >
                                                        {Object.entries(statusConfig).map(([sKey, sCfg]) => (
                                                            <option key={sKey} value={sKey}>
                                                                {sCfg.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}