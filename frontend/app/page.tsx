'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItemButton, ListItemText,
    Box, Stack, Divider, Button, TextField, Avatar, Paper, useMediaQuery, Tooltip,
    Snackbar, Alert, CircularProgress, Menu, MenuItem, ListItemIcon,
    Dialog, DialogTitle, DialogContent, DialogActions, FormGroup, FormControlLabel, Checkbox, Switch, Chip,
    Collapse, Popper, InputAdornment
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
    Settings as SettingsIcon,
    NotificationsActive as NotificationsActiveIcon,
    ExpandLess as ExpandLessIcon,
    ExpandMore as ExpandMoreIcon,
    LockReset as LockResetIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    ChevronLeft as ChevronLeftIcon,
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
import dynamic from 'next/dynamic';
import remarkGfm from 'remark-gfm';
import axios from '@/lib/axios';
import ChannelPrivacySelector from '@/components/ChannelPrivacySelector';
import { useThemeSettings } from '@/app/providers';

const ReactMarkdownLazy = dynamic(() => import('react-markdown'), { ssr: false });

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
    // 既読情報（APIの形に合わせて柔軟に対応）
    read_by_names?: string[];
    read_by_ids?: number[];
    reads?: Array<number | string>;
}

interface Channel {
    id: number;
    name: string;
    is_private?: boolean;
}

// ------------------------------
// Constants
// ------------------------------
const DEFAULT_CHANNEL_ID = 1;
const DRAWER_WIDTH = 280;
const PROFILE_EDIT_PATH = '/users/edit'; // 必要に応じて変更
const DM_PREFIX = 'dm:'; // DMチャンネル名のプレフィックス（dm:小さいID-大きいID）

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

// 正規表現エスケープ
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
// File preview (image/video/pdf/office/others)
// ------------------------------
const FilePreview: React.FC<{ url?: string; mime?: string; filename?: string }> = ({ url, mime, filename }) => {
    if (!url) return null;

    const ext = (filename?.split('.').pop()?.toLowerCase() || '').trim();
    const isImage =
        (mime && mime.startsWith('image/')) ||
        ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);
    const isVideo =
        (mime && mime.startsWith('video/')) ||
        ['mp4', 'webm', 'ogg', 'mov', 'm4v'].includes(ext);
    const isPdf =
        mime === 'application/pdf' || ext === 'pdf';
    const isOfficeDoc = (() => {
        const officeMimes = new Set<string>([
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ]);
        const officeExts = new Set<string>(['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']);
        return (mime && officeMimes.has(mime)) || officeExts.has(ext);
    })();

    if (isImage) {
        return (
            <Box my={1.5} textAlign="center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={filename || 'image'} style={{ maxWidth: '100%', borderRadius: 8 }} />
            </Box>
        );
    }

    if (isVideo) {
        return (
            <Box my={1.5}>
                <video src={url} controls style={{ width: '100%', borderRadius: 8 }} />
            </Box>
        );
    }

    if (isPdf) {
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

    // Office 系はダウンロードで開く
    if (isOfficeDoc) {
        return (
            <Box mt={1}>
                <Button
                    component="a"
                    href={url}
                    download
                    startIcon={<UploadIcon />}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {filename || 'download'}
                </Button>
            </Box>
        );
    }

    // その他はダウンロードリンク
    return (
        <Box mt={1}>
            <Button
                component="a"
                href={url}
                download
                startIcon={<UploadIcon />}
                target="_blank"
                rel="noopener noreferrer"
            >
                {filename || 'download'}
            </Button>
        </Box>
    );
};

// ------------------------------
// Markdown renderer
// ------------------------------
const MarkdownContentBase: React.FC<{ text?: string; onCopy?: (ok: boolean) => void }> = ({ text = '', onCopy }) => {
    return (
        <ReactMarkdownLazy
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
        </ReactMarkdownLazy>
    );
};
// text が変わらない限り再描画しない
const MarkdownContent = React.memo(MarkdownContentBase, (prev, next) => prev.text === next.text);

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
    readByNames?: string[];
}> = ({ msg, isOwn, isEditing, editedContent, onStartEdit, onChangeEdit, onSaveEdit, onCancelEdit, onCopy, profile, readByNames }) => {
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
        const Comp = ICON_MAP[profile.icon_name];
        avatarNode = Comp ? (
            <Avatar><Comp /></Avatar>
        ) : avatarNode;
    }

    // 添付ファイルURLを表示用に解決
    const fileResolvedUrl = toAssetUrl(msg.file_url);

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
                            <FilePreview url={fileResolvedUrl} mime={msg.mime_type} filename={msg.file_name} />

                            {Array.isArray(readByNames) && readByNames.length > 0 && (
                                <Box mt={1}>
                                    <Typography variant="caption" color="text.secondary">
                                        既読: {readByNames.join(', ')}
                                    </Typography>
                                </Box>
                            )}
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
    allUsers: Array<{ id: number; name: string }>;
    currentUserId: number | null;
    onCloseSidebar?: () => void;
}> = ({ channels, currentChannel, onSelect, onAdd, onLogout, allUsers, currentUserId, onCloseSidebar }) => {
    const [openChannels, setOpenChannels] = useState(true);

    const renderLabel = (ch: Channel) => {
        // DM: dm:<small-id>-<big-id>
        const m = /^dm:(\d+)-(\d+)$/.exec(ch.name || '');
        if (m && currentUserId != null) {
            const a = Number(m[1]);
            const b = Number(m[2]);
            const otherId = currentUserId === a ? b : currentUserId === b ? a : null;
            if (otherId != null) {
                const other = allUsers.find(u => u.id === otherId);
                if (other) return `@ ${other.name} 🔒`;
            }
            return `DM ${a}-${b} 🔒`;
        }
        return `# ${ch.name}${ch.is_private ? ' 🔒' : ''}`;
    };

    return (
        <Box role="navigation" sx={{ width: DRAWER_WIDTH }}>
            <Toolbar>
                <Typography variant="h6" noWrap>鎌倉児童ホーム</Typography>
                <IconButton
                    size="small"
                    onClick={() => onCloseSidebar && onCloseSidebar()}
                    aria-label="サイドバーを閉じる"
                    sx={{ ml: 'auto', display: { xs: 'none', md: 'inline-flex' } }}
                >
                    <ChevronLeftIcon fontSize="small" />
                </IconButton>
            </Toolbar>
            <Divider />
            <List disablePadding>
                <ListItemButton onClick={() => setOpenChannels(v => !v)}>
                    <ListItemText primary="チャンネル" />
                    {openChannels ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </ListItemButton>

                <Collapse in={openChannels} timeout="auto" unmountOnExit>
                    <List dense component="div" disablePadding>
                        {channels.map((ch) => (
                            <ListItemButton
                                key={ch.id}
                                selected={ch.id === currentChannel}
                                onClick={() => onSelect(ch.id)}
                                sx={{ pl: 3 }}
                            >
                                <ListItemText primary={renderLabel(ch)} />
                            </ListItemButton>
                        ))}
                    </List>
                </Collapse>
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
    inputRef?:
        | React.RefObject<HTMLTextAreaElement | null>
        | React.MutableRefObject<HTMLTextAreaElement | null>;
    attachedFile?: File | null;
    onAttachFile?: (f: File) => void;
    onRemoveAttachment?: () => void;
}> = ({ value, onChange, onKeyDown, onClickUpload, onSend, isSending, inputRef, attachedFile, onAttachFile, onRemoveAttachment }) => {
    const formatBytes = (bytes: number) => {
        if (!bytes && bytes !== 0) return '';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        const v = (bytes / Math.pow(k, i));
        return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${sizes[i]}`;
    };

    const handleFiles = (files?: FileList | File[] | null) => {
        if (!files || (files as FileList).length === 0) return;
        const file = (files as FileList)[0] ?? (files as File[])[0];
        if (!file) return;
        // 1GB 制限（必要に応じて調整）
        const MAX = 1024 * 1024 * 1024;
        if (file.size > MAX) {
            alert('ファイルサイズが大きすぎます（最大1GB）。');
            return;
        }
        // MIME は画面側では広めに許容。サーバが最終判定
        onAttachFile && onAttachFile(file);
    };

    const onDropArea = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (isSending) return;
        if (e.dataTransfer?.files?.length) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const onDragOverArea = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const onPasteArea = (e: React.ClipboardEvent<HTMLDivElement>) => {
        if (isSending) return;
        const items = e.clipboardData?.items;
        if (!items) return;
        const files: File[] = [];
        for (let i = 0; i < items.length; i++) {
            const it = items[i];
            if (it.kind === 'file') {
                const f = it.getAsFile();
                if (f) files.push(f);
            }
        }
        if (files.length > 0) {
            e.preventDefault();
            handleFiles(files);
        }
    };

    const renderAttachment = () => {
        if (!attachedFile) return null;
        const mime = attachedFile.type || '';
        const url = URL.createObjectURL(attachedFile);
        const removeBtn = (
            <Tooltip title="添付を削除">
                <IconButton size="small" onClick={onRemoveAttachment} aria-label="添付を削除">
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Tooltip>
        );
        if (mime.startsWith('image/')) {
            return (
                <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                        {attachedFile.name}（{formatBytes(attachedFile.size)}）
                    </Typography>
                    <Box mt={0.5} position="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={attachedFile.name} style={{ maxWidth: '100%', borderRadius: 8 }} />
                        <Box sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'background.paper', borderRadius: 1 }}>
                            {removeBtn}
                        </Box>
                    </Box>
                </Box>
            );
        }
        if (mime.startsWith('video/')) {
            return (
                <Box sx={{ mt: 1, position: 'relative' }}>
                    <Typography variant="caption" color="text.secondary">
                        {attachedFile.name}（{formatBytes(attachedFile.size)}）
                    </Typography>
                    <Box mt={0.5} position="relative">
                        <video src={url} controls style={{ width: '100%', borderRadius: 8 }} />
                        <Box sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'background.paper', borderRadius: 1 }}>
                            {removeBtn}
                        </Box>
                    </Box>
                </Box>
            );
        }
        return (
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip label={`${attachedFile.name}（${formatBytes(attachedFile.size)}）`} />
                {removeBtn}
            </Box>
        );
    };

    return (
        <Paper
            square
            elevation={0}
            sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}
            onDrop={onDropArea}
            onDragOver={onDragOverArea}
        >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="flex-end">
                <TextField
                    fullWidth
                    multiline
                    minRows={4}
                    value={value}
                    placeholder="メッセージを入力...（Ctrl/⌘ + Enterで送信、Enterは改行）\nファイルはクリップ/ドラッグ&ドロップ/ペーストでも添付できます。"
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={onKeyDown}
                    onPaste={onPasteArea}
                    inputRef={inputRef as any}
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
            {renderAttachment()}
        </Paper>
    );
};

// ------------------------------
// Main Page
// ------------------------------
export default function HomePage() {
    const router = useRouter();
    const pathname = usePathname();
    const { openSettings } = useThemeSettings();

    // UI（SSR差を避けるため noSsr 指定）
    const isUpMd = useMediaQuery('(min-width:900px)', { noSsr: true });
    const [mobileOpen, setMobileOpen] = useState(false);
    // デスクトップ用サイドバー開閉
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // サイドバー開閉状態をデスクトップ時に永続化（保存/復元）
    useEffect(() => {
        if (!isUpMd) return;
        try {
            const saved = localStorage.getItem('sidebarOpen');
            if (saved !== null) setSidebarOpen(saved === '1');
        } catch {
            // noop
        }
    }, [isUpMd]);

    useEffect(() => {
        if (!isUpMd) return;
        try {
            localStorage.setItem('sidebarOpen', sidebarOpen ? '1' : '0');
        } catch {
            // noop
        }
    }, [isUpMd, sidebarOpen]);

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const editorRef = useRef<HTMLTextAreaElement>(null);
    const lastSeenMessageIdRef = useRef<number>(0);
    const notifyInitRef = useRef<boolean>(false);

    // State
    const [channels, setChannels] = useState<Channel[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [profiles, setProfiles] = useState<Record<string, { avatar_url?: string | null; avatar_path?: string | null; icon_path?: string | null; icon_name?: string | null }>>({});
    const [currentChannel, setCurrentChannel] = useState<number>(DEFAULT_CHANNEL_ID);

    const [newMessage, setNewMessage] = useState<string>('');
    const [file, setFile] = useState<File | null>(null);

    const [currentUser, setCurrentUser] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [isManager, setIsManager] = useState<boolean>(false);
    const [isAuthChecked, setIsAuthChecked] = useState(false);

    // アクセス設定ダイアログ
    const [privacyOpen, setPrivacyOpen] = useState(false);
    const [privacySaving, setPrivacySaving] = useState(false);
    const [privacyIsPrivate, setPrivacyIsPrivate] = useState<boolean>(false);
    const [privacyMemberIds, setPrivacyMemberIds] = useState<number[]>([]);
    const [allUsers, setAllUsers] = useState<Array<{ id: number; name: string }>>([]);
    const [currentChannelMemberIds, setCurrentChannelMemberIds] = useState<number[]>([]);

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

    // メンション候補
    const [mentionOpen, setMentionOpen] = useState(false);
    const [mentionIndex, setMentionIndex] = useState(0);
    const [mentionCandidates, setMentionCandidates] = useState<Array<{ id: number; name: string }>>([]);
    const [mentionRange, setMentionRange] = useState<{ start: number; end: number } | null>(null);

    // 必要に応じユーザー一覧をロード
    const ensureUsersLoaded = useCallback(async () => {
        if (allUsers.length > 0) return;
        try {
            const ures = await axios.get('/api/users', { params: { _: Date.now() } });
            const list = (ures.data as any[]).map(u => ({ id: Number(u.id), name: String(u.name) }));
            setAllUsers(list);
        } catch {
            // noop
        }
    }, [allUsers.length]);

    // カーソル位置から @フラグメントを検出し候補表示
    const updateMentionFromCaret = useCallback(async () => {
        const el = editorRef.current;
        if (!el) return;
        const pos = el.selectionStart ?? newMessage.length;
        const text = newMessage;
        if (!text || pos < 0) {
            setMentionOpen(false);
            setMentionRange(null);
            return;
        }

        // 直近の'@'の位置を探す
        let at = -1;
        for (let i = pos - 1; i >= 0; i--) {
            const ch = text[i];
            if (ch === '@') {
                at = i;
                break;
            }
            // 区切り文字に当たったら打ち切り
            if (/\s/.test(ch)) break;
        }
        if (at < 0) {
            setMentionOpen(false);
            setMentionRange(null);
            return;
        }

        // '@'直前は文頭か空白ならOK
        if (at > 0 && !/\s/.test(text[at - 1])) {
            setMentionOpen(false);
            setMentionRange(null);
            return;
        }

        const fragment = text.slice(at + 1, pos);
        if (fragment.length < 1) {
            // 「@」のみで開かない
            setMentionOpen(false);
            setMentionRange(null);
            return;
        }

        await ensureUsersLoaded();

        const cand = allUsers
            .filter(u => u.name && u.name.toLowerCase().startsWith(fragment.toLowerCase()))
            .slice(0, 8);

        if (cand.length === 0) {
            setMentionOpen(false);
            setMentionRange(null);
            return;
        }

        setMentionCandidates(cand);
        setMentionIndex(0);
        setMentionRange({ start: at, end: pos });
        setMentionOpen(true);
    }, [newMessage, allUsers, ensureUsersLoaded]);

    const acceptMention = useCallback((name: string) => {
        if (!mentionRange) return;
        const { start, end } = mentionRange;
        const before = newMessage.slice(0, start);
        const after = newMessage.slice(end);
        const next = `${before}@${name} ${after}`;
        setNewMessage(next);
        setMentionOpen(false);
        setMentionRange(null);
        setMentionCandidates([]);
        setMentionIndex(0);
        // キャレット位置を '@name ' の末尾へ
        setTimeout(() => {
            const el = editorRef.current;
            if (!el) return;
            const caret = (before + '@' + name + ' ').length;
            el.focus();
            try {
                el.setSelectionRange(caret, caret);
            } catch {}
        }, 0);
    }, [mentionRange, newMessage]);

    // 認証チェック（初回 + フォーカス/可視化時にも再取得）
    const refreshAuth = useCallback(async () => {
        try {
            // キャッシュ回避のためにパラメータを付与
            const res = await axios.get('/api/user', { params: { _: Date.now() } });
            setCurrentUser(res.data?.name ?? null);
            setCurrentUserId(Number(res.data?.id) || null);
            // 管理者/マネージャー判定（APIの形に応じて調整）
            const admin =
                !!res.data?.is_admin ||
                res.data?.role === 'admin' ||
                (Array.isArray(res.data?.roles) && res.data.roles.includes('admin'));
            const manager =
                res.data?.role === 'manager' ||
                (Array.isArray(res.data?.roles) && res.data.roles.includes('manager'));
            setIsAdmin(Boolean(admin));
            setIsManager(Boolean(manager));
        } catch {
            setCurrentUser(null);
            setCurrentUserId(null);
            setIsAdmin(false);
            setIsManager(false);
        } finally {
            setIsAuthChecked(true);
        }
    }, []);

    useEffect(() => {
        void refreshAuth();

        const onFocus = () => { void refreshAuth(); };
        const onVisibility = () => { if (!document.hidden) void refreshAuth(); };

        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [refreshAuth]);

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
            // 背景タブではポーリングを抑止
            if (!cancelled && !document.hidden) {
                fetchMessages(currentChannel);
            }
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

    // メンション(@名前)検出 → OS通知
    useEffect(() => {
        if (!currentUser) return;
        if (!Array.isArray(messages) || messages.length === 0) return;

        const lastIdInList = messages[messages.length - 1]?.id || 0;

        // 初回は既読位置のみ更新（大量通知防止）
        if (!notifyInitRef.current) {
            notifyInitRef.current = true;
            lastSeenMessageIdRef.current = Math.max(lastSeenMessageIdRef.current, lastIdInList);
            return;
        }

        const myNames: string[] = [];
        const raw = currentUser;
        if (raw) {
            myNames.push(raw);
            const trimmed = raw.trim();
            if (trimmed && trimmed !== raw) myNames.push(trimmed);
        }

        const channelName = channels.find((c) => c.id === currentChannel)?.name || '';

        const newMsgs = messages.filter((m) => m.id > (lastSeenMessageIdRef.current || 0));
        for (const msg of newMsgs) {
            if (!msg?.content) continue;
            if (msg.user === currentUser) continue;

            const text = String(msg.content);

            // @/＠ + 名前 の厳密検知（前後が空白/区切り/文頭末尾）
            const mentioned = myNames.some((name) => {
                const pattern = new RegExp(
                    `(^|[\\s,、。!！?？:：;；()（）\\[\\]{}"'\`])[@＠]${escapeRegExp(name)}($|[\\s,、。!！?？:：;；()（）\\[\\]{}"'\`])`
                );
                return pattern.test(text);
            });
            if (!mentioned) continue;

            // Notification API によるOS通知
            if (typeof window !== 'undefined' && 'Notification' in window) {
                const show = () => {
                    try {
                        new Notification(`「@${raw}」へのメンション`, {
                            body: `${msg.user}（#${channelName}）：${text.slice(0, 80)}`,
                            icon: '/favicon.ico',
                        });
                    } catch {
                        // noop
                    }
                };

                if (Notification.permission === 'granted') {
                    show();
                } else if (Notification.permission !== 'denied') {
                    Notification.requestPermission().then((p) => {
                        if (p === 'granted') show();
                    });
                }
            }
        }

        // 既読位置を更新
        lastSeenMessageIdRef.current = lastIdInList;
    }, [messages, currentUser, currentChannel, channels]);

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
            const data = res.data as Message[];
            setMessages((prev) => {
                // 長さと末尾IDだけでは「編集による内容変更」を検出できないため、簡易的に各要素を比較
                const sameLength = prev.length === data.length;
                if (sameLength) {
                    let identical = true;
                    for (let i = 0; i < data.length; i++) {
                        const a: any = prev[i];
                        const b: any = data[i];
                        if (!a || !b) { identical = false; break; }
                        if (a.id !== b.id) { identical = false; break; }
                        // 主要フィールドの差分を検出（必要に応じて追加）
                        if (a.content !== b.content || a.file_url !== b.file_url || a.file_name !== b.file_name || a.mime_type !== b.mime_type) {
                            identical = false; break;
                        }
                    }
                    if (identical) return prev;
                }
                return data;
            });
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

    // 現在のチャンネルがプライベートかつ管理者/マネージャーのとき、メンバーを自動取得
    useEffect(() => {
        const load = async () => {
            if (!currentUser) return;
            const ch = channels.find(c => c.id === currentChannel);
            if (!ch || !ch.is_private || !(isAdmin || isManager)) {
                setCurrentChannelMemberIds([]);
                return;
            }
            try {
                // allUsers が未ロードなら取得
                if (allUsers.length === 0) {
                    const ures = await axios.get('/api/users');
                    const list = (ures.data as any[]).map(u => ({ id: Number(u.id), name: u.name }));
                    setAllUsers(list);
                }
                const res = await axios.get(`/api/channels/${currentChannel}/members`);
                setCurrentChannelMemberIds((res.data?.member_ids || []).map((n: any) => Number(n)));
            } catch {
                // 失敗時は空にしておく
                setCurrentChannelMemberIds([]);
            }
        };
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentChannel, channels, isAdmin, isManager, currentUser]);

    // API: send message
    const sendMessage = async () => {
        if (!newMessage.trim() && !file) return;
        setSending(true);
        try {
            const formData = new FormData();
            // ルーティングで渡していても、バリデーションによっては必須なことがあるため同梱
            formData.append('channel_id', String(currentChannel));
            if (currentUserId != null) formData.append('user_id', String(currentUserId));
            formData.append('user', currentUser || '');

            // content は必ず付与（空メッセージ + ファイルの場合はファイル名で補完）
            const contentToSend =
                newMessage.trim() ||
                (file ? `添付: ${file.name || 'ファイル'}` : '');
            formData.append('content', contentToSend);

            if (file) {
                formData.append('file', file);
                if (file.name) formData.append('file_name', file.name);
                if (file.type) formData.append('mime_type', file.type);
            }

            // Content-Type は axios に任せて境界線を自動付与
            await axios.post(`/api/channels/${currentChannel}/messages`, formData);

            setNewMessage('');
            setFile(null);
            await fetchMessages(currentChannel);
        } catch (e: any) {
            // サーバの詳細エラーを拾って表示
            const msg =
                e?.response?.data?.message ||
                (e?.response?.data && typeof e.response.data === 'object' && JSON.stringify(e.response.data)) ||
                '送信に失敗しました。';
            // 解析しやすいようにログも出す
            // eslint-disable-next-line no-console
            console.error('Message post error:', e?.response || e);
            setToast({ open: true, msg, sev: 'error' });
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
            return;
        }

        // メンション候補のナビゲーション
        if (mentionOpen) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setMentionIndex((i) => (i + 1) % Math.max(mentionCandidates.length, 1));
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setMentionIndex((i) => (i - 1 + Math.max(mentionCandidates.length, 1)) % Math.max(mentionCandidates.length, 1));
                return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                const pick = mentionCandidates[mentionIndex];
                if (pick) acceptMention(pick.name);
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                setMentionOpen(false);
                setMentionRange(null);
                return;
            }
        }

        // 次フレームでカーソル・値反映後に検出
        setTimeout(() => {
            updateMentionFromCaret();
        }, 0);
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
        const targetId = msg.id;
        const nextContent = editedContent;

        // 1) 楽観的更新（即時にUIへ反映）
        let prevSnapshot: Message[] = [];
        setMessages((cur) => {
            prevSnapshot = cur;
            return cur.map((m) => (m.id === targetId ? { ...m, content: nextContent } : m));
        });

        try {
            // 2) API 呼び出し
            const res = await axios.put(`/api/channels/${currentChannel}/messages/${targetId}`, { content: nextContent });
            const updated = res.data;

            // 3) 応答内容で確定反映（サーバ側で更新されたメタも適用）
            setMessages((cur) => cur.map((m) => (m.id === targetId ? { ...m, ...updated } : m)));
            setToast({ open: true, msg: 'メッセージを更新しました。', sev: 'success' });
        } catch {
            // 4) 失敗時はロールバック
            if (prevSnapshot) setMessages(prevSnapshot);
            setToast({ open: true, msg: '更新に失敗しました。', sev: 'error' });
        } finally {
            setEditingMessageId(null);
            setEditedContent('');
            // 裏で最新を再取得して最終整合（失敗してもUIは維持）
            fetchMessages(currentChannel).catch(() => {});
        }
    };

    const cancelEdit = () => {
        setEditingMessageId(null);
        setEditedContent('');
    };

    // 情報バーからアクセス設定ダイアログを開く
    const openPrivacyDialog = async () => {
        try {
            setPrivacyOpen(true);
            const res = await axios.get(`/api/channels/${currentChannel}/members`);
            setPrivacyIsPrivate(Boolean(res.data?.is_private));
            setPrivacyMemberIds((res.data?.member_ids || []).map((n: any) => Number(n)));
            if (allUsers.length === 0) {
                const ures = await axios.get('/api/users');
                const list = (ures.data as any[]).map(u => ({ id: Number(u.id), name: u.name }));
                setAllUsers(list);
            }
        } catch {
            setToast({ open: true, msg: 'アクセス設定の取得に失敗しました。', sev: 'error' });
            setPrivacyOpen(false);
        }
    };

    // ▼ 管理者専用: パスワード変更 ▼
    const [adminPwOpen, setAdminPwOpen] = useState(false);
    const [adminPwLoading, setAdminPwLoading] = useState(false);
    const [adminPwSubmitting, setAdminPwSubmitting] = useState(false);
    const [adminPwUsers, setAdminPwUsers] = useState<Array<{ id: number; name: string; role: string }>>([]);
    const [adminPwTargetId, setAdminPwTargetId] = useState<number | ''>('');
    const [adminPw, setAdminPw] = useState('');
    const [adminPwConfirm, setAdminPwConfirm] = useState('');
    const [adminPwShow, setAdminPwShow] = useState(false);
    const [adminPwShowConfirm, setAdminPwShowConfirm] = useState(false);

    const openAdminPwDialog = async () => {
        setAdminPwOpen(true);
        setAdminPwTargetId('');
        setAdminPw('');
        setAdminPwConfirm('');
        setAdminPwLoading(true);
        try {
            const res = await axios.get('/api/users', { params: { _: Date.now() } });
            const list = (res.data as any[])
                .map(u => ({
                    id: Number(u.id),
                    name: String(u.name),
                    role: String(u.role || ''),
                }))
                .filter(u => u.role === 'member' || u.role === 'manager');
            setAdminPwUsers(list);
        } catch {
            setToast({ open: true, msg: 'ユーザー一覧の取得に失敗しました。', sev: 'error' });
            setAdminPwOpen(false);
        } finally {
            setAdminPwLoading(false);
        }
    };

    const submitAdminPw = async () => {
        if (!adminPwTargetId) {
            setToast({ open: true, msg: '対象ユーザーを選択してください。', sev: 'warning' });
            return;
        }
        if (adminPw.length < 8) {
            setToast({ open: true, msg: '新しいパスワードは8文字以上で入力してください。', sev: 'warning' });
            return;
        }
        if (adminPw !== adminPwConfirm) {
            setToast({ open: true, msg: 'パスワードが一致しません。', sev: 'warning' });
            return;
        }
        setAdminPwSubmitting(true);
        try {
            await axios.put(`/api/users/${adminPwTargetId}/password`, {
                new_password: adminPw,
                new_password_confirmation: adminPwConfirm,
            });
            setToast({ open: true, msg: 'パスワードを更新しました。', sev: 'success' });
            setAdminPwOpen(false);
        } catch (e: any) {
            const apiMsg = e?.response?.data?.message;
            const errs = e?.response?.data?.errors;
            const firstErr = errs ? (() => {
                const k = Object.keys(errs)[0];
                return Array.isArray(errs[k]) ? errs[k][0] : undefined;
            })() : undefined;
            setToast({ open: true, msg: firstErr || apiMsg || '更新に失敗しました。', sev: 'error' });
        } finally {
            setAdminPwSubmitting(false);
        }
    };

    // ▼ DM（ダイレクトメッセージ）関連 ▼
    const [dmOpen, setDmOpen] = useState(false);
    const [dmQuery, setDmQuery] = useState('');
    const [dmLoading, setDmLoading] = useState(false);

    const openOrCreateDm = async (otherUserId: number) => {
        if (!currentUserId) {
            setToast({ open: true, msg: 'ユーザー情報の取得に失敗しました。', sev: 'error' });
            return;
        }
        const a = Math.min(currentUserId, otherUserId);
        const b = Math.max(currentUserId, otherUserId);
        const dmName = `${DM_PREFIX}${a}-${b}`;

        // 既存チャンネルを検索
        const exist = channels.find(c => c.name === dmName);
        if (exist) {
            setCurrentChannel(exist.id);
            await fetchMessages(exist.id);
            setDmOpen(false);
            return;
        }

        try {
            const created = await axios.post('/api/channels', { name: dmName });
            const newCh = created.data;
            await axios.put(`/api/channels/${newCh.id}/privacy`, {
                is_private: true,
                member_ids: [a, b],
            });
            setChannels(prev => [...prev, { ...newCh, is_private: true }]);
            setCurrentChannel(newCh.id);
            await fetchMessages(newCh.id);
            setToast({ open: true, msg: 'DMを開始しました。', sev: 'success' });
            setDmOpen(false);
        } catch {
            setToast({ open: true, msg: 'DMの開始に失敗しました。', sev: 'error' });
        }
    };

    // DMダイアログを開いた際にユーザー一覧をロード
    useEffect(() => {
        if (!dmOpen) return;
        // 毎回検索語はリセット
        setDmQuery('');
        if (allUsers.length > 0) return;

        let mounted = true;
        (async () => {
            setDmLoading(true);
            try {
                const ures = await axios.get('/api/users', { params: { _: Date.now() } });
                const list = (ures.data as any[]).map(u => ({ id: Number(u.id), name: String(u.name) }));
                if (mounted) setAllUsers(list);
            } catch {
                if (mounted) setToast({ open: true, msg: 'ユーザー一覧の取得に失敗しました。', sev: 'error' });
            } finally {
                if (mounted) setDmLoading(false);
            }
        })();

        return () => { mounted = false; };
    }, [dmOpen, allUsers.length]);
    // ▲ DM（ダイレクトメッセージ）関連 ▲

    // ファイル選択起動
    const triggerFileSelect = () => fileInputRef.current?.click();

    // Drawer コンテンツ
    // 自分が当事者の DM のみ表示する（dm:<smallId>-<bigId>）
    const filteredChannels = channels.filter((c) => {
        const m = /^dm:(\d+)-(\d+)$/.exec(c.name || '');
        if (!m) return true;
        if (currentUserId == null) return false;
        const a = Number(m[1]);
        const b = Number(m[2]);
        return currentUserId === a || currentUserId === b;
    });

    const drawerContent = (
        <ChannelList
            channels={filteredChannels}
            currentChannel={currentChannel}
            onSelect={(id) => {
                setCurrentChannel(id);
                setMobileOpen(false);
            }}
            onAdd={handleAddChannel}
            onLogout={handleLogout}
            allUsers={allUsers}
            currentUserId={currentUserId}
            onCloseSidebar={() => setSidebarOpen(false)}
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

    const currentChannelObj = channels.find(c => c.id === currentChannel);
    const currentChannelName = currentChannelObj?.name || 'loading...';
    const isPrivateCurrent = Boolean(currentChannelObj?.is_private);
    const canDeleteChannel = isAdmin && currentChannel !== DEFAULT_CHANNEL_ID;

    return (
        <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            {/* AppBar */}
            <AppBar position="fixed" color="default" sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                <Toolbar>
                    <IconButton
                        edge="start"
                        onClick={() => {
                            // PCでも一時ドロワー（モバイル用）を開く
                            setSidebarOpen(false);
                            setMobileOpen(v => !v);
                        }}
                        sx={{ mr: 1 }}
                        aria-label="メニューを開閉"
                    >
                        <MenuIcon />
                    </IconButton>

                    {/* チャンネル名の単純表示（ドロップダウンは削除） */}
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
                            # {currentChannelName}{isPrivateCurrent ? ' 🔒' : ''}
                        </Typography>
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

                        {isAdmin && (
                            <MenuItem
                                onClick={() => {
                                    handleCloseUserMenu();
                                    router.push('/admin');
                                }}
                            >
                                <ListItemIcon>
                                    <WorkspacePremiumIcon fontSize="small" />
                                </ListItemIcon>
                                管理者ダッシュボード
                            </MenuItem>
                        )}

                        {isManager && (
                            <MenuItem
                                onClick={() => {
                                    handleCloseUserMenu();
                                    router.push('/manager');
                                }}
                            >
                                <ListItemIcon>
                                    <BadgeIcon fontSize="small" />
                                </ListItemIcon>
                                マネージャーダッシュボード
                            </MenuItem>
                        )}

                        {isAdmin && <MenuItem disabled>管理者専用</MenuItem>}

                        {isAdmin && (
                            <MenuItem
                                onClick={() => {
                                    handleCloseUserMenu();
                                    void openAdminPwDialog();
                                }}
                            >
                                <ListItemIcon>
                                    <LockResetIcon fontSize="small" />
                                </ListItemIcon>
                                パスワード変更…
                            </MenuItem>
                        )}

                        <MenuItem
                            onClick={() => {
                                handleCloseUserMenu();
                                setDmOpen(true);
                            }}
                        >
                            <ListItemIcon>
                                <PersonIcon fontSize="small" />
                            </ListItemIcon>
                            ダイレクトメッセージ…
                        </MenuItem>

                        <MenuItem
                            onClick={() => {
                                handleCloseUserMenu();
                                openSettings();
                            }}
                        >
                            <ListItemIcon>
                                <SettingsIcon fontSize="small" />
                            </ListItemIcon>
                            表示設定
                        </MenuItem>

                        <MenuItem
                            onClick={() => {
                                handleCloseUserMenu();
                                if (typeof window === 'undefined' || !('Notification' in window)) {
                                    setToast({ open: true, msg: 'このブラウザはデスクトップ通知に対応していません。', sev: 'error' });
                                    return;
                                }
                                if (Notification.permission === 'granted') {
                                    setToast({ open: true, msg: '通知は既に有効です。', sev: 'info' });
                                    return;
                                }
                                if (Notification.permission === 'denied') {
                                    setToast({ open: true, msg: '通知はブラウザ設定でブロックされています。許可に変更してください。', sev: 'warning' });
                                    return;
                                }
                                Notification.requestPermission().then((p) => {
                                    if (p === 'granted') {
                                        setToast({ open: true, msg: 'デスクトップ通知を有効化しました。', sev: 'success' });
                                    } else {
                                        setToast({ open: true, msg: '通知は許可されませんでした。', sev: 'info' });
                                    }
                                });
                            }}
                        >
                            <ListItemIcon>
                                <NotificationsActiveIcon fontSize="small" />
                            </ListItemIcon>
                            デスクトップ通知を有効化
                        </MenuItem>

                        {(isAdmin || isManager) && (
                            <MenuItem
                                onClick={async () => {
                                    handleCloseUserMenu();
                                    await openPrivacyDialog();
                                }}
                            >
                                <ListItemIcon>
                                    <BuildIcon fontSize="small" />
                                </ListItemIcon>
                                アクセス設定
                            </MenuItem>
                        )}

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
            <Box
                component="nav"
                sx={{
                    width: { md: sidebarOpen ? DRAWER_WIDTH : 0 },
                    flexShrink: { md: 0 },
                    transition: (theme) =>
                        theme.transitions.create('width', {
                            easing: theme.transitions.easing.sharp,
                            duration: theme.transitions.duration.enteringScreen,
                        }),
                }}
                aria-label="channels"
            >
                {/* Mobile */}
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={() => setMobileOpen(false)}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: 'block',
                        '& .MuiDrawer-paper': { width: DRAWER_WIDTH }
                    }}
                >
                    {drawerContent}
                </Drawer>
                {/* Desktop */}
                <Drawer
                    variant="persistent"
                    open={sidebarOpen}
                    sx={{
                        display: { xs: 'none', md: 'block' },
                        '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' }
                    }}
                >
                    {drawerContent}
                </Drawer>
            </Box>

            {/* Main */}
            <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Toolbar /> {/* AppBar offset */}

                {/* プライベートチャンネルの閲覧メンバー表示（管理者/マネージャーのみ） */}
                {isPrivateCurrent && (isAdmin || isManager) && (
                    <Box sx={{ px: 2, pt: 1 }}>
                        <Paper variant="outlined" sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography variant="caption" color="text.secondary">閲覧メンバー:</Typography>
                            {currentChannelMemberIds.length === 0 ? (
                                <Typography variant="caption" color="text.secondary">なし</Typography>
                            ) : (
                                currentChannelMemberIds.map((uid) => {
                                    const name = allUsers.find(u => u.id === uid)?.name ?? `ID:${uid}`;
                                    return <Chip key={uid} label={name} size="small" />;
                                })
                            )}
                            <Box sx={{ ml: 'auto' }}>
                                <Button size="small" onClick={openPrivacyDialog}>アクセス設定</Button>
                            </Box>
                        </Paper>
                    </Box>
                )}

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

                                // 既読者名を抽出（可能ならID→名前へ変換）
                                let readByNames: string[] = [];
                                const anyMsg: any = msg as any;
                                if (Array.isArray(anyMsg.read_by_names)) {
                                    readByNames = anyMsg.read_by_names.filter((n: any) => typeof n === 'string') as string[];
                                } else if (Array.isArray(anyMsg.readByNames)) {
                                    readByNames = anyMsg.readByNames.filter((n: any) => typeof n === 'string') as string[];
                                } else if (Array.isArray(anyMsg.read_by_ids)) {
                                    readByNames = anyMsg.read_by_ids
                                        .map((id: any) => allUsers.find((u) => u.id === Number(id))?.name)
                                        .filter((n: any) => typeof n === 'string') as string[];
                                } else if (Array.isArray(anyMsg.reads)) {
                                    readByNames = anyMsg.reads
                                        .map((v: any) => (typeof v === 'number' ? allUsers.find((u) => u.id === v)?.name : String(v)))
                                        .filter((n: any) => typeof n === 'string') as string[];
                                }

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
                                        readByNames={readByNames}
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
                    onChange={(v) => {
                        setNewMessage(v);
                        // 入力変化でも検出を試行
                        setTimeout(() => updateMentionFromCaret(), 0);
                    }}
                    onKeyDown={handleEditorKeyDown}
                    onClickUpload={triggerFileSelect}
                    onSend={sendMessage}
                    isSending={sending}
                    inputRef={editorRef}
                    attachedFile={file}
                    onAttachFile={(f) => setFile(f)}
                    onRemoveAttachment={() => setFile(null)}
                />
                <input
                    type="file"
                    ref={fileInputRef}
                    hidden
                    accept="image/*,video/*,application/pdf,.txt,.md,.csv,.json,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    onChange={(e) => e.target.files && setFile(e.target.files[0])}
                />

                <Popper
                    open={mentionOpen}
                    anchorEl={editorRef.current}
                    placement="top-start"
                    modifiers={[
                        { name: 'offset', options: { offset: [0, 8] } },
                    ]}
                    sx={{ zIndex: (t) => t.zIndex.modal + 1 }}
                >
                    <Paper variant="outlined" sx={{ maxHeight: 240, overflowY: 'auto', minWidth: 220 }}>
                        <List dense>
                            {mentionCandidates.map((u, idx) => (
                                <ListItemButton
                                    key={u.id}
                                    selected={idx === mentionIndex}
                                    onMouseDown={(e) => e.preventDefault()} // フォーカス奪取での閉じ防止
                                    onClick={() => acceptMention(u.name)}
                                >
                                    <ListItemText primary={u.name} />
                                </ListItemButton>
                            ))}
                        </List>
                    </Paper>
                </Popper>
            </Box>

            {/* 右下フローティングの「アクセス設定」ボタンはユーザーメニューに統合しました */}

            {/* アクセス設定ダイアログ */}
            <Dialog open={privacyOpen} onClose={() => setPrivacyOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>チャンネルのアクセス設定</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2}>
                        <ChannelPrivacySelector
                            isPrivate={privacyIsPrivate}
                            onChange={setPrivacyIsPrivate}
                        />
                        {privacyIsPrivate ? (
                            <FormGroup>
                                {allUsers.map((u) => (
                                    <FormControlLabel
                                        key={u.id}
                                        control={
                                            <Checkbox
                                                checked={privacyMemberIds.includes(u.id)}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    setPrivacyMemberIds((prev) =>
                                                        checked ? Array.from(new Set([...prev, u.id])) : prev.filter((id) => id !== u.id)
                                                    );
                                                }}
                                            />
                                        }
                                        label={u.name}
                                    />
                                ))}
                            </FormGroup>
                        ) : (
                            <Alert severity="info">公開チャンネルです。全ユーザーが閲覧できます。</Alert>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPrivacyOpen(false)}>キャンセル</Button>
                    <Button
                        variant="contained"
                        disabled={privacySaving}
                        onClick={async () => {
                            setPrivacySaving(true);
                            try {
                                await axios.put(`/api/channels/${currentChannel}/privacy`, {
                                    is_private: privacyIsPrivate,
                                    member_ids: privacyIsPrivate ? privacyMemberIds : [],
                                });
                                setToast({ open: true, msg: 'アクセス設定を更新しました。', sev: 'success' });
                                setPrivacyOpen(false);
                                // チャンネル一覧を更新して 🔒 の表示など反映
                                await fetchChannels();
                            } catch {
                                setToast({ open: true, msg: '更新に失敗しました。', sev: 'error' });
                            } finally {
                                setPrivacySaving(false);
                            }
                        }}
                    >
                        保存
                    </Button>
                </DialogActions>
            </Dialog>

            {/* DM開始ダイアログ */}
            <Dialog open={dmOpen} onClose={() => setDmOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>ダイレクトメッセージを開始</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2}>
                        <TextField
                            label="ユーザー検索"
                            placeholder="名前で検索"
                            value={dmQuery}
                            onChange={(e) => setDmQuery(e.target.value)}
                            fullWidth
                        />

                        {dmLoading ? (
                            <Stack alignItems="center" py={2}>
                                <CircularProgress size={24} />
                            </Stack>
                        ) : (
                            <List dense>
                                {allUsers
                                    .filter((u) => (currentUserId == null || u.id !== currentUserId))
                                    .filter((u) => {
                                        const q = dmQuery.trim().toLowerCase();
                                        return q ? u.name.toLowerCase().includes(q) : true;
                                    })
                                    .slice(0, 30)
                                    .map((u) => (
                                        <ListItemButton key={u.id} onClick={() => openOrCreateDm(u.id)}>
                                            <ListItemText primary={u.name} />
                                        </ListItemButton>
                                    ))
                                }
                            </List>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDmOpen(false)}>閉じる</Button>
                </DialogActions>
            </Dialog>

            {/* 管理者専用: パスワード変更ダイアログ */}
            <Dialog open={adminPwOpen} onClose={() => setAdminPwOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>パスワード変更（管理者専用）</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2}>
                        <Typography variant="body2" color="text.secondary">
                            対象はメンバー/マネージャーのみです。
                        </Typography>

                        <TextField
                            select
                            label="対象ユーザー"
                            value={adminPwTargetId}
                            onChange={(e) => setAdminPwTargetId(Number(e.target.value) || '')}
                            fullWidth
                            disabled={adminPwLoading}
                        >
                            {adminPwUsers.map((u) => (
                                <MenuItem key={u.id} value={u.id}>
                                    {u.name}（{u.role}）
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            label="新しいパスワード"
                            type={adminPwShow ? 'text' : 'password'}
                            value={adminPw}
                            onChange={(e) => setAdminPw(e.target.value)}
                            fullWidth
                            helperText="8文字以上"
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => setAdminPwShow((v) => !v)}
                                            edge="end"
                                            aria-label="パスワード表示切替"
                                        >
                                            {adminPwShow ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <TextField
                            label="新しいパスワード（確認）"
                            type={adminPwShowConfirm ? 'text' : 'password'}
                            value={adminPwConfirm}
                            onChange={(e) => setAdminPwConfirm(e.target.value)}
                            fullWidth
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => setAdminPwShowConfirm((v) => !v)}
                                            edge="end"
                                            aria-label="確認用パスワード表示切替"
                                        >
                                            {adminPwShowConfirm ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAdminPwOpen(false)} disabled={adminPwSubmitting}>キャンセル</Button>
                    <Button
                        variant="contained"
                        onClick={submitAdminPw}
                        disabled={adminPwSubmitting || adminPwLoading}
                    >
                        更新
                    </Button>
                </DialogActions>
            </Dialog>

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
