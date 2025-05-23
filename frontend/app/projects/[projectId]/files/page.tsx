'use client'

import { useState, useEffect, ChangeEvent } from 'react'
import { useParams } from 'next/navigation'
import axios from '@/lib/axios'

type ProjectFile = {
    id: number
    original_name: string
    path: string
    mime_type: string
    size: number
    user: { id: number; name: string }
    created_at: string
}

export default function FilesPage() {
    const { projectId } = useParams()
    const [files, setFiles] = useState<ProjectFile[]>([])
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)

    useEffect(() => {
        fetchFiles()
    }, [projectId])

    const fetchFiles = async () => {
        try {
            const res = await axios.get(`/api/projects/${projectId}/files`)
            setFiles(res.data)
        } catch (err) {
            console.error(err)
        }
    }

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        setFile(e.target.files?.[0] ?? null)
    }

    const handleUpload = async () => {
        if (!file) return
        setUploading(true)
        try {
            const form = new FormData()
            form.append('file', file)
            await axios.post(`/api/projects/${projectId}/files`, form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
            await fetchFiles()
            setFile(null)
        } catch (err) {
            console.error(err)
        }
        setUploading(false)
    }

    const handleDelete = async (id: number) => {
        try {
            await axios.delete(`/api/projects/${projectId}/files/${id}`)
            await fetchFiles()
        } catch (err) {
            console.error(err)
        }
    }

    return (
        <div className="container mt-4">
            <h1 className="mb-4">ファイル管理</h1>

            <div className="input-group mb-4">
                <input
                    type="file"
                    className="form-control"
                    onChange={handleChange}
                />
                <button
                    className="btn btn-primary"
                    onClick={handleUpload}
                    disabled={!file || uploading}
                >
                    {uploading ? 'アップロード中…' : 'アップロード'}
                </button>
            </div>

            <ul className="list-group">
                {files.map(f => (
                    <li
                        key={f.id}
                        className="list-group-item d-flex justify-content-between align-items-start"
                    >
                        <div className="ms-2 me-auto">
                            {f.mime_type.startsWith('image/') && (
                                <img
                                    src={f.path}
                                    alt={f.original_name}
                                    className="img-fluid mb-2"
                                />
                            )}
                            <div>
                                <a
                                    href={f.path}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="fw-bold text-decoration-none"
                                >
                                    {f.original_name}
                                </a>
                            </div>
                            <small className="text-muted">
                                {f.user.name} · {new Date(f.created_at).toLocaleString()}
                            </small>
                        </div>
                        <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(f.id)}
                        >
                            削除
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    )
}
