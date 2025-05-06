'use client';

import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Plus, Send, X, User, Upload, Copy } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import axios from '@/lib/axios';

interface Message {
    id: number;
    user: string;
    content?: string;
    file_url?: string;
    file_name?: string;
    timestamp: string;
    channelId: number;
}
interface Channel {
    id: number;
    name: string;
}

const DEFAULT_CHANNEL_ID = 1;

export default function HomePage() {
    const router = useRouter();
    const pathname = usePathname();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [channels, setChannels] = useState<Channel[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentChannel, setCurrentChannel] = useState<number>(DEFAULT_CHANNEL_ID);
    const [newMessage, setNewMessage] = useState<string>('');
    const [file, setFile] = useState<File | null>(null);
    const [currentUser, setCurrentUser] = useState<string | null>(null);
    const [isAuthChecked, setIsAuthChecked] = useState(false);
    const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
    const [editedContent, setEditedContent] = useState<string>('');

    // Markdownコンテンツレンダー
    const renderContent = (text: string = ''): ReactNode => (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
                code: (props: any) => {
                    const { inline, children } = props;
                    const codeText = String(children).replace(/\n$/, '');
                    if (inline) {
                        return <code {...props}>{codeText}</code>;
                    }
                    return (
                        <div className="position-relative mb-3">
                            <pre className="p-3 bg-light rounded border"><code>{codeText}</code></pre>
                            <button
                                className="position-absolute top-0 end-0 m-2 btn btn-sm btn-outline-secondary"
                                onClick={() => navigator.clipboard.writeText(codeText)}
                                title="Copy code"
                            >
                                <Copy size={16} />
                            </button>
                        </div>
                    );
                }
            }}
        >
            {text}
        </ReactMarkdown>
    );
    // 認証チェック
    useEffect(() => {
        (async () => {
            try {
                const res = await axios.get('/api/user');
                setCurrentUser(res.data.name);
            } catch {
                setCurrentUser(null);
            } finally {
                setIsAuthChecked(true);
            }
        })();
    }, []);

    // 未認証時リダイレクト
    useEffect(() => {
        if (isAuthChecked && !currentUser && pathname !== '/login') {
            router.replace('/login');
        }
    }, [isAuthChecked, currentUser, pathname, router]);

    // 自動スクロール
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchChannels = async () => {
        try {
            const res = await axios.get('/api/channels');
            setChannels(res.data);
        } catch {
            console.error('チャンネル取得エラー');
        }
    };

    const fetchMessages = async (channelId: number) => {
        try {
            const res = await axios.get(`/api/channels/${channelId}/messages`);
setMessages(res.data);
} catch {
    console.error('メッセージ取得エラー');
    setMessages([]);
}
};

useEffect(() => {
    if (currentUser) {
        fetchChannels();
        fetchMessages(currentChannel);
    }
}, [currentChannel, currentUser]);

const handleLogout = async () => {
    await axios.post('/api/logout');
    router.replace('/login');
};

const sendMessage = async () => {
    if (!newMessage.trim() && !file) return;
    const formData = new FormData();
    formData.append('user', currentUser || '');
    if (newMessage.trim()) formData.append('content', newMessage);
    if (file) formData.append('file', file);
    await axios.post(
        `/api/channels/${currentChannel}/messages`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    setNewMessage('');
    setFile(null);
    fetchMessages(currentChannel);
};

const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
};

// Ctrl+Enter または Command+Enter で投稿、通常 Enter は改行
const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.key === 'Enter' && e.ctrlKey) || (e.key === 'Enter' && e.metaKey)) {
        e.preventDefault();
        sendMessage();
    } else if (e.key === 'Enter') {
        e.preventDefault();
        setNewMessage(val => val + '\n');
    }
};

const handleAddChannel = async () => {
    const name = prompt('新しいチャンネル名を入力してください');
    if (!name) return;
    const res = await axios.post('/api/channels', { name });
    setChannels(prev => [...prev, res.data]);
    setCurrentChannel(res.data.id);
};

if (!isAuthChecked) {
    return <div className="text-center mt-5">認証チェック中…</div>;
}

return (
    <div className="container-fluid vh-100 d-flex p-0">
        {/* モバイル用オフキャンバスボタン */}
        <button
            className="btn btn-outline-light position-fixed top-0 start-0 m-3 d-md-none"
            type="button"
            data-bs-toggle="offcanvas"
            data-bs-target="#channelSidebar"
            aria-controls="channelSidebar"
        >
            <Plus />
        </button>

        {/* オフキャンバスサイドバー（モバイル） */}
        <div
            className="offcanvas offcanvas-start bg-dark text-light"
            tabIndex={-1}
            id="channelSidebar"
            aria-labelledby="channelSidebarLabel"
        >
            <div className="offcanvas-header">
                <h5 id="channelSidebarLabel">鎌倉児童ホーム</h5>
                <button
                    type="button"
                    className="btn-close btn-close-white"
                    data-bs-dismiss="offcanvas"
                    aria-label="Close"
                />
            </div>
            <div className="offcanvas-body p-0">
                <ul className="nav nav-pills flex-column mb-2">
                    {channels.map(ch => (
                        <li key={ch.id} className="nav-item mb-1">
                            <a
                                className={`nav-link text-start text-light ${ch.id === currentChannel ? 'active bg-primary' : ''}`}
                                style={{ cursor: 'pointer' }}
                                onClick={() => setCurrentChannel(ch.id)}
                                data-bs-dismiss="offcanvas"
                            >
                                # {ch.name}
                            </a>
                        </li>
                    ))}
                </ul>
                <button className="btn btn-sm btn-outline-light mb-2 m-3" onClick={handleAddChannel}>
                    <Plus className="me-1" /> チャンネル追加
                </button>
                <button className="btn btn-sm btn-outline-light m-3" onClick={handleLogout}>
                    <X className="me-1" /> ログアウト
                </button>
            </div>
        </div>

        {/* デスクトップ用サイドバー */}
        <aside className="col-md-3 col-lg-2 bg-dark text-light border-end d-none d-md-flex flex-column p-3">
            <h4 className="mb-4">鎌倉児童ホーム</h4>
            <ul className="nav nav-pills flex-column mb-3">
                {channels.map(ch => (
                    <li key={ch.id} className="nav-item mb-1">
                        <a
                            className={`nav-link text-start text-light ${ch.id === currentChannel ? 'active bg-primary' : ''}`}
                            style={{ cursor: 'pointer' }}
                            onClick={() => setCurrentChannel(ch.id)}
                        >
                            # {ch.name}
                        </a>
                    </li>
                ))}
            </ul>
            <button className="btn btn-sm btn-outline-light mb-2" onClick={handleAddChannel}>
                <Plus className="me-1" /> チャンネル追加
            </button>
            <button className="btn btn-sm btn-outline-light mt-auto" onClick={handleLogout}>
                <X className="me-1" /> ログアウト
            </button>
        </aside>

        {/* メインエリア */}
        <main className="col p-0 d-flex flex-column">
            {/* チャンネルヘッダー */}
            <div className="border-bottom bg-white p-3 d-flex justify-content-between align-items-center">
                <h5 className="mb-0"># {channels.find(c => c.id === currentChannel)?.name}</h5>
                <span className="text-secondary">{currentUser}</span>
            </div>

            {/* メッセージリスト */}
            <div className="flex-grow-1 overflow-auto bg-light p-3">
                {messages.map(msg => {
                    const isEditing = editingMessageId === msg.id;
                    return (
                        <div key={msg.id} className="d-flex mb-3">
                            <div className="me-3">
                                <User className="text-secondary" size={32} />
                            </div>
                            <div className="flex-grow-1">
                                <div className="d-flex align-items-baseline mb-1">
                                    <strong className="me-2">{msg.user}</strong>
                                    <small className="text-muted">{msg.timestamp}</small>
                                    {msg.user === currentUser && !isEditing && (
                                        <button
                                            className="btn btn-sm btn-link text-secondary ms-auto"
                                            onClick={() => {
                                                setEditingMessageId(msg.id);
                                                setEditedContent(msg.content || '');
                                            }}
                                        >
                                            編集
                                        </button>
                                    )}
                                </div>
                                {isEditing ? (
                                    <div className="d-flex">
                                            <textarea
                                                className="form-control me-2"
                                                rows={2}
                                                value={editedContent}
                                                onChange={e => setEditedContent(e.target.value)}
                                            />
                                        <button
                                            className="btn btn-sm btn-primary me-1"
                                            onClick={async () => {
                                                await axios.put(
                                                    `/api/channels/${currentChannel}/messages/${msg.id}`,
                                                    { content: editedContent }
                                                );
                                                setEditingMessageId(null);
                                                fetchMessages(currentChannel);
                                            }}
                                        >
                                            保存
                                        </button>
                                        <button
                                            className="btn btn-sm btn-secondary"
                                            onClick={() => setEditingMessageId(null)}
                                        >
                                            キャンセル
                                        </button>
                                    </div>
                                ) : (
                                    <div className="bg-white rounded p-2 border" style={{ whiteSpace: 'pre-wrap' }}>
                                        {renderContent(msg.content)}
                                        {msg.file_url && (
                                            <div className="mt-2">
                                                <a href={msg.file_url} download className="d-flex align-items-center">
                                                    <Upload className="me-1" /> {msg.file_name}
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* メッセージ入力 */}
            <form onSubmit={handleSendMessage} className="p-3 border-top bg-white d-flex align-items-end">
                    <textarea
                        className="form-control me-2"
                        placeholder="メッセージを入力... (Ctrl+Enter / ⌘+Enterで投稿、Enterは改行)"
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={2}
                        style={{ resize: 'none' }}
                    />
                <button
                    className="btn btn-outline-secondary me-2"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Upload />
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="d-none"
                    onChange={e => e.target.files && setFile(e.target.files[0])}
                />
                <button type="submit" className="btn btn-primary">
                    <Send />
                </button>
            </form>
        </main>
    </div>
);
}
