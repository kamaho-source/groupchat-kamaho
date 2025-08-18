'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
    AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItemButton, ListItemText,
    Box, Stack, Divider, Button, TextField, Avatar, Paper, useMediaQuery, Tooltip,
    Snackbar, Alert, CircularProgress, Menu, MenuItem, ListItemIcon
} from '@mui/material';
import {
    Send as SendIcon,
    Upload as UploadIcon,
    Add as AddIcon,
    Logout as LogoutIcon,
    Menu as MenuIcon,
    Edit as EditIcon,
    Save as SaveIcon,
    Close as CloseIcon,
    ContentCopy as ContentCopyIcon,
    ArrowDropDown as ArrowDropDownIcon,
    DeleteForever as DeleteForeverIcon,
    AccountCircle as AccountCircleIcon,
} from '@mui/icons-material';
import FolderIcon from '@mui/icons-material/Folder';
import PersonIcon from '@mui/icons-material/Person';
import StarIcon from '@mui/icons-material/Star';
import BuildIcon from '@mui/icons-material/Build';
import CodeIcon from '@mui/icons-material/Code';
import SchoolIcon from '@mui/icons-material/School';
import GroupIcon from '@mui/icons-material/Group';
import BadgeIcon from '@mui/icons-material/Badge';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import { Container as MuiContainer } from '@mui/material';
import { useRouter, usePathname } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import axios from '@/lib/axios';
import * as MuiIcons from '@mui/icons-material';

// ------------------------------
// Types
// ------------------------------
interface Message {
    id: number;
    user: string;
    content?: string;
    file_url?: string;
    file_name?: string;
    mime_type?: string;
    timestamp: string;
    channelId: number;
}

interface Channel {
    id: number;
    name: string;
}

// ------------------------------
// Constants
// ------------------------------
const DEFAULT_CHANNEL_ID = 1;
const DRAWER_WIDTH = 280;
const PROFILE_EDIT_PATH = '/users/edit'; // 必要に応じて変更

// ------------------------------
// Helpers
// ------------------------------
const formatTimestamp = (ts: string) => ts;

const copyToClipboard = async (text: string) => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
};

// 画像/アイコンの相対パスをURLに解決するヘルパー（Next.js rewrites 前提）
// - すでに絶対URLなら、そのパスが /storage/ なら pathname(+search) に落としてプロキシを使う
// - 先頭 "/" の相対URLはそのまま（/storage/... は next.config.ts でバックエンドへプロキシ）
// - "public/..." は "/storage/..." に変換
// - "storage/..." は "/storage/..." に変換
// - プレーンな相対パスは "/storage/" を付与
const toAssetUrl = (input?: string | null): string | undefined => {
    if (!input) return undefined;
    const raw = String(input).trim();
    if (!raw) return undefined;

    // 絶対URLの場合でも、/storage/ 配下なら rewrite を活かすためにパスへ変換
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
        try {
            const u = new URL(raw);
            if (u.pathname.startsWith('/storage/')) {
                return `${u.pathname}${u.search || ''}`;
            }
            return raw;
        } catch {
            // 不正なURLは下の分岐でベストエフォート処理
        }
    }

    if (raw.startsWith('/')) return raw;
    if (raw.startsWith('public/')) return `/storage/${raw.slice('public/'.length)}`;
    if (raw.startsWith('storage/')) return `/${raw}`;
    return `/storage/${raw}`;
};

// ------------------------------
// File preview (image/pdf/others)
// ------------------------------
const FilePreview: React.FC<{ url?: string; mime?: string; filename?: string }> = ({ url, mime, filename }) => {
    if (!url || !mime) return null;
    if (mime.startsWith('image/')) {
        return (
            <Box my={1.5} textAlign="center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={filename || 'image'} style={{ maxWidth: '100%', borderRadius: 8 }} />
            </Box>
        );
    }
    if (mime === 'application/pdf') {
        return (
            <Box my={1.5} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                <iframe
                    src={url}
                    width="100%"
                    height="500"
                    style={{ border: 'none' }}
                    title={filename || 'embedded-pdf'}
                />
            </Box>
        );
    }
    return (
        <Box mt={1}>
            <Button component="a" href={url} download startIcon={<UploadIcon />}>
                {filename || 'download'}
            </Button>
        </Box>
    );
};

// ------------------------------
// Markdown renderer
// ------------------------------
const MarkdownContent: React.FC<{ text?: string; onCopy?: (ok: boolean) => void }> = ({ text = '', onCopy }) => {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
                code: (props: any) => {
                    const { inline, children } = props;
                    const codeText = String(children).replace(/\n$/, '');
                    if (inline) return <code {...props}>{codeText}</code>;
                    return (
                        <Box position="relative" mb={2}>
                            <Box component="pre" sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, border: '1px solid', borderColor: 'divider', overflowX: 'auto' }}>
                                <code>{codeText}</code>
                            </Box>
                            <Tooltip title="Copy code">
                                <IconButton
                                    size="small"
                                    sx={{ position: 'absolute', top: 6, right: 6 }}
                                    onClick={async () => onCopy && onCopy(await copyToClipboard(codeText))}
                                    aria-label="コードをコピー"
                                >
                                    <ContentCopyIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    );
                },
            }}
        >
            {text}
        </ReactMarkdown>
    );
};

// ------------------------------
// Icons map for known Material Icons names (minimized bundle)
// ------------------------------
const ICON_MAP: Record<string, React.ElementType> = {
    Folder: FolderIcon,
    AccountCircle: AccountCircleIcon,
    Person: PersonIcon,
    Star: StarIcon,
    Build: BuildIcon,
    Code: CodeIcon,
    School: SchoolIcon,
    Group: GroupIcon,
    Badge: BadgeIcon,
    WorkspacePremium: WorkspacePremiumIcon,
};

// ------------------------------
// Single message item
// ------------------------------
const MessageItem: React.FC<{
    msg: Message;
    isOwn: boolean;
    isEditing: boolean;
    editedContent: string;
    onStartEdit: () => void;
    onChangeEdit: (v: string) => void;
    onSaveEdit: () => void;
    onCancelEdit: () => void;
    onCopy: (ok: boolean) => void;
    profile?: { avatar_url?: string | null; avatar_path?: string | null; icon_path?: string | null; icon_name?: string | null };
}> = ({ msg, isOwn, isEditing, editedContent, onStartEdit, onChangeEdit, onSaveEdit, onCancelEdit, onCopy, profile }) => {
    const initial = msg.user?.slice(0, 1) || 'U';
    let avatarNode: React.ReactNode = <Avatar sx={{ bgcolor: 'grey.300' }}>{initial}</Avatar>;

    // avatar_url → avatar_path → icon_path の順でURLを解決（相対パスはBACKEND_BASEで絶対化）
    let resolvedUrl: string | undefined =
        toAssetUrl(profile?.avatar_url) ||
        toAssetUrl(profile?.avatar_path) ||
        toAssetUrl(profile?.icon_path);

    if (resolvedUrl) {
        avatarNode = <Avatar src={resolvedUrl} />;
    } else if (profile?.icon_name) {
        const fixed = ICON_MAP[profile.icon_name];
        const dynamic = (MuiIcons as any)[profile.icon_name] as React.ElementType | undefined;
        const Comp = fixed || dynamic;
        avatarNode = Comp ? (
            <Avatar><Comp /></Avatar>
        ) : avatarNode;
    }

    return (
        <Stack direction="row" spacing={2} mb={2}>
            {avatarNode}
            <Box flex={1}>
                <Stack direction="row" spacing={1} alignItems="baseline" mb={0.5}>
                    <Typography variant="subtitle2" fontWeight={600}>{msg.user}</Typography>
                    <Typography variant="caption" color="text.secondary">{formatTimestamp(msg.timestamp)}</Typography>
                    {isOwn && !isEditing && (
                        <Box ml="auto">
                            <Tooltip title="編集">
                                <IconButton size="small" onClick={onStartEdit} aria-label="メッセージを編集">
                                    <EditIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    )}
                </Stack>

                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                    {isEditing ? (
                        <Stack direction="row" spacing={1} alignItems="flex-end">
                            <TextField
                                fullWidth
                                multiline
                                minRows={2}
                                value={editedContent}
                                onChange={(e) => onChangeEdit(e.target.value)}
                                placeholder="メッセージを編集"
                            />
                            <Tooltip title="保存">
                                <IconButton color="primary" onClick={onSaveEdit} aria-label="保存">
                                    <SaveIcon />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="キャンセル">
                                <IconButton onClick={onCancelEdit} aria-label="キャンセル">
                                    <CloseIcon />
                                </IconButton>
                            </Tooltip>
                        </Stack>
                    ) : (
                        <>
                            <Box sx={{ whiteSpace: 'pre-wrap' }}>
                                <MarkdownContent text={msg.content} onCopy={onCopy} />
                            </Box>
                            <FilePreview url={msg.file_url} mime={msg.mime_type} filename={msg.file_name} />
                        </>
                    )}
                </Paper>
            </Box>
        </Stack>
    );
};

// ------------------------------
// Channel list
// ------------------------------
const ChannelList: React.FC<{
    channels: Channel[];
    currentChannel: number;
    onSelect: (id: number) => void;
    onAdd: () => void;
    onLogout: () => void;
}> = ({ channels, currentChannel, onSelect, onAdd, onLogout }) => {
    return (
        <Box role="navigation" sx={{ width: DRAWER_WIDTH }}>
            <Toolbar>
                <Typography variant="h6" noWrap>鎌倉児童ホーム</Typography>
            </Toolbar>
            <Divider />
            <List dense>
                {channels.map((ch) => (
                    <ListItemButton
                        key={ch.id}
                        selected={ch.id === currentChannel}
                        onClick={() => onSelect(ch.id)}
                    >
                        <ListItemText primary={`# ${ch.name}`} />
                    </ListItemButton>
                ))}
            </List>
            <Box px={2} py={1}>
                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" fullWidth startIcon={<AddIcon />} onClick={onAdd}>
                        追加
                    </Button>
                    <Button variant="outlined" fullWidth startIcon={<LogoutIcon />} onClick={onLogout}>
                        ログアウト
                    </Button>
                </Stack>
            </Box>
        </Box>
    );
};

// ------------------------------
// Message input area
// ------------------------------
const MessageInput: React.FC<{
    value: string;
    onChange: (v: string) => void;
    // TextField にそのまま渡すため、div ラッパの KeyboardEvent 型
    onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
    onClickUpload: () => void;
    onSend: () => void;
    isSending?: boolean;
}> = ({ value, onChange, onKeyDown, onClickUpload, onSend, isSending }) => {
    return (
        <Paper square elevation={0} sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="flex-end">
                <TextField
                    fullWidth
                    multiline
                    minRows={4}
                    value={value}
                    placeholder="メッセージを入力...（Ctrl/⌘ + Enterで送信、Enterは改行）"
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={onKeyDown}
                />
                <Stack direction="row" spacing={1}>
                    <Tooltip title="ファイルを添付">
                        <span>
                            <IconButton aria-label="ファイルを添付" onClick={onClickUpload} disabled={isSending}>
                                <UploadIcon />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Button variant="contained" endIcon={<SendIcon />} onClick={onSend} disabled={isSending}>
                        送信
                    </Button>
                </Stack>
            </Stack>
        </Paper>
    );
};

// ------------------------------
// Main Page
// ------------------------------
export default function HomePage() {
    const router = useRouter();
    const pathname = usePathname();

    // UI（SSR差を避けるため noSsr 指定）
    const isUpMd = useMediaQuery('(min-width:900px)', { noSsr: true });
    const [mobileOpen, setMobileOpen] = useState(false);

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State
    const [channels, setChannels] = useState<Channel[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [profiles, setProfiles] = useState<Record<string, { avatar_url?: string | null; avatar_path?: string | null; icon_path?: string | null; icon_name?: string | null }>>({});
    const [currentChannel, setCurrentChannel] = useState<number>(DEFAULT_CHANNEL_ID);

    const [newMessage, setNewMessage] = useState<string>('');
    const [file, setFile] = useState<File | null>(null);

    const [currentUser, setCurrentUser] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [isAuthChecked, setIsAuthChecked] = useState(false);

    const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
    const [editedContent, setEditedContent] = useState<string>('');

    // ▼▼ チャンネル名ドロップダウン（既存） ▼▼
    const [channelMenuAnchorEl, setChannelMenuAnchorEl] = useState<null | HTMLElement>(null);
    const openChannelMenu = Boolean(channelMenuAnchorEl);
    const handleOpenChannelMenu = (e: React.MouseEvent<HTMLElement>) => setChannelMenuAnchorEl(e.currentTarget);
    const handleCloseChannelMenu = () => setChannelMenuAnchorEl(null);
    const handleSelectChannel = (id: number) => {
        setCurrentChannel(id);
        handleCloseChannelMenu();
    };
    // ▲▲ ここまで ▲▲

    // ▼▼ ユーザー名ドロップダウン（新規） ▼▼
    const [userMenuAnchorEl, setUserMenuAnchorEl] = useState<null | HTMLElement>(null);
    const openUserMenu = Boolean(userMenuAnchorEl);
    const handleOpenUserMenu = (e: React.MouseEvent<HTMLElement>) => setUserMenuAnchorEl(e.currentTarget);
    const handleCloseUserMenu = () => setUserMenuAnchorEl(null);

    const goToUserEdit = () => {
        handleCloseUserMenu();
        router.push(PROFILE_EDIT_PATH);
    };

    const handleDeleteCurrentChannel = async () => {
        handleCloseUserMenu();
        const current = channels.find(c => c.id === currentChannel);
        const name = current?.name ?? String(currentChannel);

        if (currentChannel === DEFAULT_CHANNEL_ID) {
            setToast({ open: true, msg: '既定チャンネルは削除できません。', sev: 'warning' });
            return;
        }
        if (!current) {
            setToast({ open: true, msg: 'チャンネル情報の取得に失敗しました。', sev: 'error' });
            return;
        }

        const ok = window.confirm(`チャンネル「${name}」を削除します。よろしいですか？（この操作は取り消せません）`);
        if (!ok) return;

        try {
            await axios.delete(`/api/channels/${currentChannel}`);
            setToast({ open: true, msg: `チャンネル「${name}」を削除しました。`, sev: 'success' });

            // リスト更新 & 選択チャンネル切替
            setChannels(prev => prev.filter(c => c.id !== currentChannel));
            const nextId = channels.find(c => c.id !== currentChannel)?.id ?? DEFAULT_CHANNEL_ID;
            setCurrentChannel(nextId);
            await fetchMessages(nextId);
        } catch {
            setToast({ open: true, msg: 'チャンネル削除に失敗しました。', sev: 'error' });
        }
    };
    // ▲▲ ここまで ▲▲

    // UX
    const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'info' | 'warning' | 'error' }>({ open: false, msg: '', sev: 'info' });
    const [loadingInitial, setLoadingInitial] = useState(true);
    const [sending, setSending] = useState(false);

    // 認証チェック
    useEffect(() => {
        (async () => {
            try {
                const res = await axios.get('/api/user');
                setCurrentUser(res.data?.name ?? null);
                // 管理者判定（APIの形に応じて調整）
                const admin =
                    !!res.data?.is_admin ||
                    res.data?.role === 'admin' ||
                    (Array.isArray(res.data?.roles) && res.data.roles.includes('admin'));
                setIsAdmin(Boolean(admin));
            } catch {
                setCurrentUser(null);
                setIsAdmin(false);
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

    // 初期ロード + ポーリング（HMR二重起動防止）
    const pollRef = useRef<number | null>(null);
    useEffect(() => {
        if (!currentUser) return;

        let cancelled = false;

        (async () => {
            try {
                await fetchChannels();
                await fetchMessages(currentChannel);
            } finally {
                setLoadingInitial(false);
            }
        })();

        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = window.setInterval(() => {
            if (!cancelled) fetchMessages(currentChannel);
        }, 3000);

        return () => {
            cancelled = true;
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentChannel, currentUser]);

    // 自動スクロール
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // API: fetch channels
    const fetchChannels = async () => {
        try {
            const res = await axios.get('/api/channels');
            setChannels(res.data);
        } catch {
            setToast({ open: true, msg: 'チャンネル取得に失敗しました。', sev: 'error' });
        }
    };

    // API: fetch messages
    const fetchMessages = async (channelId: number) => {
        try {
            const res = await axios.get(`/api/channels/${channelId}/messages`);
            setMessages(res.data);
        } catch {
            setMessages([]);
            setToast({ open: true, msg: 'メッセージ取得に失敗しました。', sev: 'error' });
        }
    };


    // Users: 全ユーザーのプロフィール（avatar_url / avatar_path / icon_path / icon_name）を取得して、name と user_id の両方で参照できるようにする
    useEffect(() => {
        if (!currentUser) return;
        (async () => {
            try {
                const res = await axios.get('/api/users');
                const map: Record<string, { avatar_url?: string | null; avatar_path?: string | null; icon_path?: string | null; icon_name?: string | null }> = {};
                for (const u of res.data as Array<{ name: string; user_id?: string | null; avatar_url?: string | null; avatar_path?: string | null; icon_path?: string | null; icon_name?: string | null }>) {
                    const profile = {
                        avatar_url: u.avatar_url ?? null,
                        avatar_path: u.avatar_path ?? null,
                        icon_path: u.icon_path ?? null,
                        icon_name: u.icon_name ?? null
                    };
                    // name で参照
                    if (u?.name) {
                        map[u.name] = profile;
                        const trimmed = u.name.trim();
                        if (trimmed && trimmed !== u.name) {
                            map[trimmed] = profile;
                        }
                    }
                    // user_id でも参照（メッセージ側が user_id を入れている場合に対応）
                    if (u?.user_id) {
                        map[u.user_id] = profile;
                        const trimmedId = u.user_id.trim();
                        if (trimmedId && trimmedId !== u.user_id) {
                            map[trimmedId] = profile;
                        }
                    }
                }
                setProfiles(map);
            } catch {
                // 取得失敗時は初期の頭文字表示にフォールバック
            }
        })();
    }, [currentUser]);

    // API: send message
    const sendMessage = async () => {
        if (!newMessage.trim() && !file) return;
        setSending(true);
        try {
            const formData = new FormData();
            formData.append('user', currentUser || '');
            if (newMessage.trim()) formData.append('content', newMessage);
            if (file) formData.append('file', file);

            await axios.post(`/api/channels/${currentChannel}/messages`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setNewMessage('');
            setFile(null);
            await fetchMessages(currentChannel);
        } catch {
            setToast({ open: true, msg: '送信に失敗しました。', sev: 'error' });
        } finally {
            setSending(false);
        }
    };

    // 入力エリアのキー操作
    const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        const isEnter = (e.key === 'Enter');
        const isSubmitCombo = (isEnter && (e.ctrlKey || e.metaKey));
        if (isSubmitCombo) {
            e.preventDefault();
            void sendMessage();
        }
    };

    // チャンネル追加
    const handleAddChannel = async () => {
        const name = window.prompt('新しいチャンネル名を入力してください');
        if (!name) return;
        try {
            const res = await axios.post('/api/channels', { name });
            setChannels((prev) => [...prev, res.data]);
            setCurrentChannel(res.data.id);
            setToast({ open: true, msg: `チャンネル「${name}」を作成しました。`, sev: 'success' });
        } catch {
            setToast({ open: true, msg: 'チャンネル作成に失敗しました。', sev: 'error' });
        }
    };

    // ログアウト
    const handleLogout = async () => {
        try {
            await axios.post('/api/logout');
        } finally {
            router.replace('/login');
        }
    };

    // メッセージ編集
    const startEdit = (msg: Message) => {
        setEditingMessageId(msg.id);
        setEditedContent(msg.content || '');
    };

    const saveEdit = async (msg: Message) => {
        try {
            await axios.put(`/api/channels/${currentChannel}/messages/${msg.id}`, { content: editedContent });
            setEditingMessageId(null);
            await fetchMessages(currentChannel);
            setToast({ open: true, msg: 'メッセージを更新しました。', sev: 'success' });
        } catch {
            setToast({ open: true, msg: '更新に失敗しました。', sev: 'error' });
        }
    };

    const cancelEdit = () => {
        setEditingMessageId(null);
        setEditedContent('');
    };

    // ファイル選択起動
    const triggerFileSelect = () => fileInputRef.current?.click();

    // Drawer コンテンツ
    const drawerContent = (
        <ChannelList
            channels={channels}
            currentChannel={currentChannel}
            onSelect={(id) => {
                setCurrentChannel(id);
                setMobileOpen(false);
            }}
            onAdd={handleAddChannel}
            onLogout={handleLogout}
        />
    );

    if (!isAuthChecked) {
        return (
            <Box sx={{ height: '100vh', display: 'grid', placeItems: 'center' }}>
                <Stack alignItems="center" spacing={2}>
                    <CircularProgress />
                    <Typography variant="body2" color="text.secondary">認証チェック中…</Typography>
                </Stack>
            </Box>
        );
    }

    const currentChannelName = channels.find(c => c.id === currentChannel)?.name || 'loading...';
    const canDeleteChannel = isAdmin && currentChannel !== DEFAULT_CHANNEL_ID;

    return (
        <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            {/* AppBar */}
            <AppBar position="fixed" color="default" sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                <Toolbar>
                    {!isUpMd && (
                        <IconButton edge="start" onClick={() => setMobileOpen(v => !v)} sx={{ mr: 1 }} aria-label="チャンネルメニューを開く">
                            <MenuIcon />
                        </IconButton>
                    )}

                    {/* チャンネル名ドロップダウン */}
                    <Box sx={{ flexGrow: 1 }}>
                        <Button
                            id="channel-menu-button"
                            color="inherit"
                            onClick={handleOpenChannelMenu}
                            endIcon={<ArrowDropDownIcon />}
                            sx={{ textTransform: 'none', fontSize: '1.1rem', fontWeight: 600, px: 0 }}
                            aria-controls={openChannelMenu ? 'channel-menu' : undefined}
                            aria-haspopup="true"
                            aria-expanded={openChannelMenu ? 'true' : undefined}
                        >
                            # {currentChannelName}
                        </Button>

                        <Menu
                            id="channel-menu"
                            anchorEl={channelMenuAnchorEl}
                            open={openChannelMenu}
                            onClose={handleCloseChannelMenu}
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                        >
                            {channels.map((ch) => (
                                <MenuItem
                                    key={ch.id}
                                    selected={ch.id === currentChannel}
                                    onClick={() => handleSelectChannel(ch.id)}
                                >
                                    # {ch.name}
                                </MenuItem>
                            ))}
                            <Divider />
                            <MenuItem
                                onClick={() => {
                                    handleCloseChannelMenu();
                                    handleAddChannel();
                                }}
                            >
                                <ListItemIcon>
                                    <AddIcon fontSize="small" />
                                </ListItemIcon>
                                新規チャンネル…
                            </MenuItem>
                        </Menu>
                    </Box>

                    {/* ▼ ユーザー名ドロップダウン（ユーザー編集／管理者はチャンネル削除） ▼ */}
                    <Button
                        id="user-menu-button"
                        color="inherit"
                        onClick={handleOpenUserMenu}
                        endIcon={<ArrowDropDownIcon />}
                        sx={{ textTransform: 'none' }}
                        aria-controls={openUserMenu ? 'user-menu' : undefined}
                        aria-haspopup="true"
                        aria-expanded={openUserMenu ? 'true' : undefined}
                    >
                        {currentUser}
                    </Button>

                    <Menu
                        id="user-menu"
                        anchorEl={userMenuAnchorEl}
                        open={openUserMenu}
                        onClose={handleCloseUserMenu}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    >
                        <MenuItem onClick={goToUserEdit}>
                            <ListItemIcon>
                                <AccountCircleIcon fontSize="small" />
                            </ListItemIcon>
                            ユーザー編集
                        </MenuItem>
                        <Divider />
                        <MenuItem onClick={handleDeleteCurrentChannel} disabled={!canDeleteChannel}>
                            <ListItemIcon>
                                <DeleteForeverIcon fontSize="small" />
                            </ListItemIcon>
                            チャンネル削除（管理者）
                        </MenuItem>
                    </Menu>
                    {/* ▲ ここまで ▲ */}
                </Toolbar>
            </AppBar>

            {/* Left Drawer */}
            <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }} aria-label="channels">
                {/* Mobile */}
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={() => setMobileOpen(false)}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { xs: 'block', md: 'none' },
                        '& .MuiDrawer-paper': { width: DRAWER_WIDTH }
                    }}
                >
                    {drawerContent}
                </Drawer>
                {/* Desktop */}
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', md: 'block' },
                        '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' }
                    }}
                    open
                >
                    {drawerContent}
                </Drawer>
            </Box>

            {/* Main */}
            <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Toolbar /> {/* AppBar offset */}
                {/* メッセージ一覧 */}
                <Box sx={{ flex: 1, overflowY: 'auto', bgcolor: 'grey.50', p: 2 }}>
                    {loadingInitial ? (
                        <Box sx={{ height: '100%', display: 'grid', placeItems: 'center' }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <MuiContainer maxWidth="md" disableGutters>
                            {messages.map((msg) => {
                                const isOwn = msg.user === currentUser;
                                const isEditing = editingMessageId === msg.id;
                                const rawKey = msg.user || '';
                                const trimmedKey = rawKey.trim();
                                const profile = profiles[rawKey] || profiles[trimmedKey] || undefined;
                                return (
                                            <MessageItem
                                                key={msg.id}
                                                msg={msg}
                                                isOwn={isOwn}
                                                isEditing={isEditing}
                                                editedContent={isEditing ? editedContent : (msg.content || '')}
                                                onStartEdit={() => startEdit(msg)}
                                                onChangeEdit={setEditedContent}
                                                onSaveEdit={() => saveEdit(msg)}
                                                onCancelEdit={cancelEdit}
                                                onCopy={(ok) => setToast({ open: true, msg: ok ? 'コードをコピーしました。' : 'コピーに失敗しました。', sev: ok ? 'success' : 'error' })}
                                                profile={profile}
                                            />
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </MuiContainer>
                    )}
                </Box>

                {/* 入力エリア */}
                <MessageInput
                    value={newMessage}
                    onChange={setNewMessage}
                    onKeyDown={handleEditorKeyDown}
                    onClickUpload={triggerFileSelect}
                    onSend={sendMessage}
                    isSending={sending}
                />
                <input
                    type="file"
                    ref={fileInputRef}
                    hidden
                    accept="image/*,application/pdf,.txt,.md,.csv,.json,.zip"
                    onChange={(e) => e.target.files && setFile(e.target.files[0])}
                />
            </Box>

            {/* Toast */}
            <Snackbar
                open={toast.open}
                autoHideDuration={3000}
                onClose={() => setToast((t) => ({ ...t, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={toast.sev} variant="filled" sx={{ width: '100%' }}>
                    {toast.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
}
