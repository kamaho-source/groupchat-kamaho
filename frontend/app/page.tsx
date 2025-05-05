'use client';

import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Plus, Send, X, User } from 'lucide-react';
import axios from '@/lib/axios';

interface Message {
    id: number;
    user: string;
    content: string;
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

    const [channels, setChannels] = useState<Channel[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentChannel, setCurrentChannel] = useState<number>(DEFAULT_CHANNEL_ID);
    const [newMessage, setNewMessage] = useState<string>('');
    const [currentUser, setCurrentUser] = useState<string | null>(null);
    const [isAuthChecked, setIsAuthChecked] = useState(false);

    // URL変換関数
    const renderContent = (text: string): ReactNode[] => {
        const urlRegex = /(https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+)/g;
        return text.split(urlRegex).map((part, index) => {
            if (urlRegex.test(part)) {
                return (
                    <a key={index} href={part} target="_blank" rel="noopener noreferrer">
                        {part}
                    </a>
                );
            }
            return <span key={index}>{part}</span>;
        });
    };

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

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        await axios.post(`/api/channels/${currentChannel}/messages`, {
            user: currentUser,
            content: newMessage,
        });
        setNewMessage('');
        fetchMessages(currentChannel);
    };

    const handleAddChannel = async () => {
        const name = prompt('新しいチャンネル名を入力してください');
        if (!name) return;
        const res = await axios.post('/api/channels', { name });
        setChannels(prev => [...prev, res.data]);
        setCurrentChannel(res.data.id);
    };

    if (!isAuthChecked) return <div className="text-center mt-5">認証チェック中…</div>;

    return (
        <div className="container-fluid vh-100 d-flex p-0">
            <aside className="col-md-3 col-lg-2 bg-light border-end d-flex flex-column p-3">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5>Channels</h5>
                    <button className="btn btn-sm btn-outline-primary" onClick={handleAddChannel}>
                        <Plus />
                    </button>
                </div>
                <ul className="list-group flex-grow-1 mb-3">
                    {channels.map(ch => (
                        <li
                            key={ch.id}
                            className={`list-group-item list-group-item-action ${ch.id === currentChannel ? 'active' : ''}`}
                            onClick={() => setCurrentChannel(ch.id)}
                            style={{ cursor: 'pointer' }}
                        >
                            <User className="me-2" /> {ch.name}
                        </li>
                    ))}
                </ul>
                <button className="btn btn-outline-danger mt-auto" onClick={handleLogout}>
                    <X className="me-1" /> Logout
                </button>
            </aside>

            <main className="col p-0 d-flex flex-column">
                <div className="flex-grow-1 overflow-auto p-3 bg-white">
                    {messages.map(msg => (
                        <div key={msg.id} className="mb-3">
                            <div className="fw-bold">{msg.user}</div>
                            <div className="border rounded p-2">
                                {renderContent(msg.content)}
                            </div>
                            <small className="text-muted">{msg.timestamp}</small>
                        </div>
                    ))}
                    <div ref={messagesEndRef}></div>
                </div>
                <form onSubmit={handleSendMessage} className="p-3 border-top bg-light d-flex">
                    <input
                        type="text"
                        className="form-control me-2"
                        placeholder="メッセージを入力..."
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary">
                        <Send />
                    </button>
                </form>
            </main>
        </div>
    );
}
