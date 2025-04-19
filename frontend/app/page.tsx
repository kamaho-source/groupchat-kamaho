'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Send, X, User } from 'lucide-react';
import axios from 'axios';

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
const SIDEBAR_WIDTH = 250;

export default function HomePage() {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [channels, setChannels] = useState<Channel[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentChannel, setCurrentChannel] = useState<number>(DEFAULT_CHANNEL_ID);
    const [newMessage, setNewMessage] = useState<string>('');
    const [currentUser, setCurrentUser] = useState<string>('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [showChannels, setShowChannels] = useState(true);

    // 一番下にスクロール
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // 認証済ユーザーを取得
    useEffect(() => {
        axios.get('http://localhost:8080/api/user', { withCredentials: true })
            .then(res => setCurrentUser(res.data.name))
            .catch(err => console.error('ログインユーザー取得エラー', err));
    }, []);

    // チャンネル一覧取得
    const fetchChannels = async () => {
        try {
            const res = await axios.get('http://localhost:8080/api/channels');
            setChannels(res.data);
        } catch (e) {
            console.error('チャンネル取得エラー', e);
        }
    };

    // メッセージ一覧取得
    const fetchMessages = async (channelId: number) => {
        try {
            const res = await axios.get(
                `http://localhost:8080/api/channels/${channelId}/messages`,
                { withCredentials: true }
            );
            const data = res.data;
            setMessages(Array.isArray(data) ? data : data.data ?? []);
        } catch (e) {
            console.error('メッセージ取得エラー', e);
            setMessages([]);
        }
    };

    // 初回・チャンネル変更時にデータロード
    useEffect(() => {
        fetchChannels();
        fetchMessages(currentChannel);
    }, [currentChannel]);

    // メッセージ送信
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        try {
            await axios.post(
                `http://localhost:8080/api/channels/${currentChannel}/messages`,
                { user: currentUser, content: newMessage },
                { withCredentials: true }
            );
            await fetchMessages(currentChannel);
            setNewMessage('');
        } catch (e) {
            console.error('メッセージ送信エラー', e);
        }
    };

    // チャンネル作成
    const handleAddChannel = async () => {
        const name = prompt('新しいチャンネル名を入力してください');
        if (!name) return;
        try {
            const res = await axios.post(
                'http://localhost:8080/api/channels',
                { name },
                { withCredentials: true }
            );
            setChannels(prev => [...prev, res.data]);
            setCurrentChannel(res.data.id);
            setNewMessage('');
            await fetchMessages(res.data.id);
        } catch (e) {
            console.error('チャンネル作成エラー', e);
            alert('チャンネル作成に失敗しました');
        }
    };

    // チャンネル選択
    const handleChannelSelect = (id: number) => {
        setCurrentChannel(id);
        fetchMessages(id);
        if (window.innerWidth < 768) setIsSidebarOpen(false);
    };

    const currentChannelName = channels.find(c => c.id === currentChannel)?.name ?? 'チャンネルなし';

    return (
        <div className="d-flex vh-100">
            {/* サイドバー */}
            <div
                className={`bg-chatwork position-fixed d-md-block ${isSidebarOpen ? 'd-block' : 'd-none'}`}
                style={{ width: SIDEBAR_WIDTH, height: '100vh', zIndex: 1050 }}
            >
                <div className="p-3 sidebar-section">
                    <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center">
                            <div
                                className="rounded-circle bg-chatwork-primary d-flex justify-content-center align-items-center avatar"
                                style={{ width: 36, height: 36 }}
                            >
                                <User size={18} color="#fff" />
                            </div>
                            <div className="ms-2 text-white fw-bold">{currentUser || '—'}</div>
                        </div>
                        <X
                            size={20}
                            className="cursor-pointer d-md-none text-white"
                            onClick={() => setIsSidebarOpen(false)}
                        />
                    </div>
                </div>
                {/* チャンネルリスト */}
                <div className="p-3">
                    <div
                        className="d-flex justify-content-between text-white-50 align-items-center"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setShowChannels(s => !s)}
                    >
                        <ChevronDown size={16} />
                        <span>チャンネル</span>
                        <Plus size={16} onClick={handleAddChannel} />
                    </div>
                    {showChannels && channels.map(ch => (
                        <div
                            key={ch.id}
                            className={`py-1 px-2 ${ch.id === currentChannel ? 'bg-chatwork-selected' : ''}`}
                            style={{ cursor: 'pointer', color: 'white' }}
                            onClick={() => handleChannelSelect(ch.id)}
                        >
                            #{ch.name}
                        </div>
                    ))}
                </div>
            </div>

            {/* メインエリア */}
            <div
                className="bg-white d-flex flex-column flex-grow-1"
                style={{ marginLeft: isSidebarOpen ? SIDEBAR_WIDTH : 0 }}
            >
                {/* チャンネルヘッダー */}
                <div className="border-bottom p-3 bg-light fw-bold">
                    {currentChannelName}
                </div>

                {/* メッセージ一覧 */}
                <div className="flex-grow-1 overflow-auto p-3">
                    {messages.map(msg => {
                        const isOwn = msg.user === currentUser;
                        const time = new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit', minute: '2-digit'
                        });
                        return (
                            <div
                                key={msg.id}
                                className="d-flex mb-3"
                                style={{ justifyContent: isOwn ? 'flex-end' : 'flex-start' }}
                            >
                                {!isOwn && (
                                    <div
                                        className="me-2 rounded-circle bg-secondary d-flex justify-content-center align-items-center"
                                        style={{ width: 36, height: 36 }}
                                    >
                                        <User size={18} color="#fff" />
                                    </div>
                                )}
                                <div style={{ maxWidth: '75%', textAlign: isOwn ? 'right' : 'left' }}>
                                    {!isOwn && (
                                        <div className="text-muted small mb-1">{msg.user} {time}</div>
                                    )}
                                    <div
                                        className={`p-2 px-3 rounded-3 ${
                                            isOwn ? 'bg-primary text-white' : 'bg-light text-dark'
                                        }`}
                                        style={{ wordBreak: 'break-word' }}
                                    >
                                        {msg.content}
                                    </div>
                                    {isOwn && <div className="text-muted small mt-1">{time}</div>}
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* 入力欄 */}
                <form onSubmit={handleSendMessage} className="d-flex p-3 border-top">
                    <input
                        type="text"
                        className="form-control me-2"
                        placeholder="メッセージを入力..."
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary d-flex align-items-center">
                        <Send size={16} />
                    </button>
                </form>
            </div>
        </div>
    );
}
