'use client';

import React from 'react';
import {
    Box,
    Container,
    Typography,
    Paper,
    Stack,
    CircularProgress,
    Button,
    FormControlLabel,
    Switch,
    Snackbar,
    Alert,
    TextField,
    IconButton,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Checkbox,
    FormGroup,
    List,
    ListItemButton,
    ListItemText,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import axios from '@/lib/axios';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';

export default function AdminDashboardPage() {
    const router = useRouter();
    const [checking, setChecking] = React.useState(true);
    const [authorized, setAuthorized] = React.useState(false);

    type AdminUser = { id: number; name: string; roles: string[] };

    const [users, setUsers] = React.useState<AdminUser[]>([]);
    const [loadingUsers, setLoadingUsers] = React.useState(true);
    const [savingIds, setSavingIds] = React.useState<Set<number>>(new Set());
    const [toast, setToast] = React.useState<{ open: boolean; msg: string; sev: 'success' | 'info' | 'warning' | 'error' }>({ open: false, msg: '', sev: 'info' });

    // システム概況
    const [statsLoading, setStatsLoading] = React.useState(true);
    const [stats, setStats] = React.useState<{
        users_count: number;
        channels_count: number;
        private_channels_count: number;
        messages_count: number;
        messages_today: number;
        generated_at?: string;
    } | null>(null);

    // チャンネル管理
    type ChannelRow = { id: number; name: string; is_private?: boolean };
    const [channels, setChannels] = React.useState<ChannelRow[]>([]);
    const [channelsLoading, setChannelsLoading] = React.useState(true);
    const [editingChannelId, setEditingChannelId] = React.useState<number | null>(null);
    const [editingChannelName, setEditingChannelName] = React.useState<string>('');
    const [membersOpen, setMembersOpen] = React.useState(false);
    const [membersLoading, setMembersLoading] = React.useState(false);
    const [membersChannelId, setMembersChannelId] = React.useState<number | null>(null);
    const [membersIds, setMembersIds] = React.useState<number[]>([]);

    React.useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const res = await axios.get('/api/user', { params: { _: Date.now() } });
                const data = res.data || {};
                const isAdmin =
                    !!data?.is_admin ||
                    data?.role === 'admin' ||
                    (Array.isArray(data?.roles) && data.roles.includes('admin'));
                if (mounted) {
                    setAuthorized(Boolean(isAdmin));
                    if (!isAdmin) router.replace('/');
                }
            } catch {
                if (mounted) {
                    setAuthorized(false);
                    router.replace('/login');
                }
            } finally {
                if (mounted) setChecking(false);
            }
        })();
        return () => { mounted = false; };
    }, [router]);

    React.useEffect(() => {
        if (!authorized) return;
        let mounted = true;
        (async () => {
            setLoadingUsers(true);
            try {
                const res = await axios.get('/api/users', { params: { _: Date.now() } });
                const list = Array.isArray(res.data) ? res.data : [];
                const normalized = list.map((u: any) => {
                    const roles: string[] = [];
                    if (u?.is_admin) roles.push('admin');
                    if (u?.role && typeof u.role === 'string') roles.push(u.role);
                    if (Array.isArray(u?.roles)) {
                        for (const r of u.roles) {
                            if (typeof r === 'string' && !roles.includes(r)) roles.push(r);
                        }
                    }
                    return { id: Number(u.id), name: String(u.name), roles };
                });
                if (mounted) setUsers(normalized);
            } catch {
                if (mounted) setUsers([]);
                setToast({ open: true, msg: 'ユーザー一覧の取得に失敗しました。', sev: 'error' });
            } finally {
                if (mounted) setLoadingUsers(false);
            }
        })();
        return () => { mounted = false; };
    }, [authorized]);

    // 統計とチャンネル一覧の取得
    React.useEffect(() => {
        if (!authorized) return;
        let mounted = true;
        (async () => {
            // 統計
            setStatsLoading(true);
            try {
                const sres = await axios.get('/api/admin/stats', { params: { _: Date.now() } });
                if (mounted) setStats(sres.data);
            } catch {
                if (mounted) setStats(null);
                setToast({ open: true, msg: 'システム統計の取得に失敗しました。', sev: 'error' });
            } finally {
                if (mounted) setStatsLoading(false);
            }

            // チャンネル一覧
            setChannelsLoading(true);
            try {
                const cres = await axios.get('/api/channels', { params: { _: Date.now() } });
                const list: ChannelRow[] = Array.isArray(cres.data) ? cres.data : [];
                if (mounted) setChannels(list);
            } catch {
                if (mounted) setChannels([]);
                setToast({ open: true, msg: 'チャンネル一覧の取得に失敗しました。', sev: 'error' });
            } finally {
                if (mounted) setChannelsLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [authorized]);

    if (checking) {
        return (
            <Box sx={{ height: '100vh', display: 'grid', placeItems: 'center' }}>
                <Stack alignItems="center" spacing={2}>
                    <CircularProgress />
                    <Typography variant="body2" color="text.secondary">権限を確認しています…</Typography>
                </Stack>
            </Box>
        );
    }

    if (!authorized) return null;

    // チャンネル作成
    const createChannel = async () => {
        const name = window.prompt('新しいチャンネル名を入力してください');
        if (!name) return;
        try {
            const res = await axios.post('/api/channels', { name });
            setChannels((prev) => [...prev, res.data]);
            setToast({ open: true, msg: `チャンネル「${name}」を作成しました。`, sev: 'success' });
        } catch {
            setToast({ open: true, msg: 'チャンネル作成に失敗しました。', sev: 'error' });
        }
    };

    // 名称編集開始
    const startRename = (ch: ChannelRow) => {
        setEditingChannelId(ch.id);
        setEditingChannelName(ch.name);
    };

    // 名称保存
    const saveRename = async (ch: ChannelRow) => {
        try {
            const res = await axios.put(`/api/channels/${ch.id}`, { name: editingChannelName });
            setChannels((prev) => prev.map((c) => (c.id === ch.id ? { ...c, name: res.data.name ?? editingChannelName } : c)));
            setEditingChannelId(null);
            setEditingChannelName('');
            setToast({ open: true, msg: 'チャンネル名を更新しました。', sev: 'success' });
        } catch {
            setToast({ open: true, msg: '名称の更新に失敗しました。', sev: 'error' });
        }
    };

    // 削除
    const deleteChannel = async (ch: ChannelRow) => {
        if (ch.id === 1) {
            setToast({ open: true, msg: '既定チャンネルは削除できません。', sev: 'warning' });
            return;
        }
        const ok = window.confirm(`チャンネル「${ch.name}」を削除します。よろしいですか？`);
        if (!ok) return;
        try {
            await axios.delete(`/api/channels/${ch.id}`);
            setChannels((prev) => prev.filter((c) => c.id !== ch.id));
            setToast({ open: true, msg: 'チャンネルを削除しました。', sev: 'success' });
        } catch {
            setToast({ open: true, msg: '削除に失敗しました。', sev: 'error' });
        }
    };

    // 限定公開の切替（メンバーはそのまま）
    const togglePrivate = async (ch: ChannelRow) => {
        try {
            const nextPrivate = !ch.is_private;
            await axios.put(`/api/channels/${ch.id}/privacy`, {
                is_private: nextPrivate,
                // 既存メンバー維持（未取得の場合は空: サーバ側で全員/誰も閲覧できないなど、実装に合わせて）
                member_ids: [],
            });
            setChannels((prev) => prev.map((c) => (c.id === ch.id ? { ...c, is_private: nextPrivate } : c)));
            setToast({ open: true, msg: `チャンネルを${nextPrivate ? '限定公開' : '公開'}に変更しました。`, sev: 'success' });
        } catch {
            setToast({ open: true, msg: '公開設定の更新に失敗しました。', sev: 'error' });
        }
    };

    // メンバー管理ダイアログを開く
    const openMembers = async (ch: ChannelRow) => {
        setMembersOpen(true);
        setMembersChannelId(ch.id);
        setMembersLoading(true);
        try {
            const res = await axios.get(`/api/channels/${ch.id}/members`);
            const ids: number[] = (res.data?.member_ids || []).map((n: any) => Number(n));
            setMembersIds(ids);
        } catch {
            setMembersIds([]);
            setToast({ open: true, msg: 'メンバーの取得に失敗しました。', sev: 'error' });
        } finally {
            setMembersLoading(false);
        }
    };

    // メンバー保存
    const saveMembers = async () => {
        if (!membersChannelId) return;
        try {
            await axios.put(`/api/channels/${membersChannelId}/privacy`, {
                is_private: true,
                member_ids: membersIds,
            });
            setChannels((prev) => prev.map((c) => (c.id === membersChannelId ? { ...c, is_private: true } : c)));
            setToast({ open: true, msg: 'メンバー設定を更新しました。', sev: 'success' });
            setMembersOpen(false);
        } catch {
            setToast({ open: true, msg: 'メンバー設定の更新に失敗しました。', sev: 'error' });
        }
    };

    const setRole = async (userId: number, role: 'admin' | 'manager', checked: boolean) => {
        // 事前のロールを保持（失敗時ロールバック用）
        const prev = users.find(u => u.id === userId);
        const prevRoles = prev ? [...prev.roles] : [];
        const prevName = prev?.name;

        // 楽観的更新
        setUsers((list) =>
            list.map((u) =>
                u.id === userId
                    ? {
                          ...u,
                          roles: Array.from(
                              new Set(
                                  checked ? [...u.roles, role] : u.roles.filter((r) => r !== role)
                              )
                          ),
                      }
                    : u
            )
        );
        setSavingIds((s) => {
            const n = new Set(s);
            n.add(userId);
            return n;
        });

        const next = checked ? Array.from(new Set([...prevRoles, role])) : prevRoles.filter((r) => r !== role);

        try {
            let success = false;
            const isAdminNext = next.includes('admin');
            const isManagerNext = next.includes('manager');

            // 試行1: 専用エンドポイント（一般的な形）
            try {
                await axios.put(`/api/users/${userId}/roles`, { roles: next });
                success = true;
            } catch (e: any) {
                // 試行2: ユーザー更新で roles を送る（name が必須な実装に対応）
                if (!success && prevName) {
                    try {
                        await axios.put(`/api/users/${userId}`, { name: prevName, roles: next });
                        success = true;
                    } catch {}
                }
                // 試行3: PATCH で roles を送る（name 同梱）
                if (!success && prevName) {
                    try {
                        await axios.patch(`/api/users/${userId}`, { name: prevName, roles: next });
                        success = true;
                    } catch {}
                }
                // 試行4: ブール併用パターン（name 同梱）
                if (!success && prevName) {
                    try {
                        await axios.put(`/api/users/${userId}`, {
                            name: prevName,
                            roles: next,
                            is_admin: isAdminNext,
                            // 単一 role を要求する実装向けの保険（admin と併存するケースは roles 優先）
                            role: isManagerNext ? 'manager' : isAdminNext ? 'admin' : null,
                        });
                        success = true;
                    } catch (e2: any) {
                        // すべて失敗したら元の例外を再スロー
                        throw e2 || e;
                    }
                }
            }

            if (!success) {
                throw new Error('ロール更新APIが利用できません。');
            }

            setToast({ open: true, msg: 'ロールを更新しました。', sev: 'success' });
        } catch (e: any) {
            // ロールバック
            setUsers((list) =>
                list.map((u) => (u.id === userId ? { ...u, roles: prevRoles } : u))
            );
            const msg =
                (e && e.response && (e.response.data?.message || e.response.data?.error)) ||
                e?.message ||
                'ロールの更新に失敗しました。';
            setToast({ open: true, msg, sev: 'error' });
        } finally {
            setSavingIds((s) => {
                const n = new Set(s);
                n.delete(userId);
                return n;
            });
        }
    };

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" fontWeight={700}>管理者ダッシュボード</Typography>
                <Button variant="outlined" onClick={() => router.push('/')}>ホームへ戻る</Button>
            </Stack>

            <Stack spacing={2}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="h6" mb={1}>システム概況</Typography>
                    {statsLoading ? (
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <CircularProgress size={20} />
                            <Typography variant="body2" color="text.secondary">読み込み中…</Typography>
                        </Stack>
                    ) : !stats ? (
                        <Typography variant="body2" color="text.secondary">統計情報を取得できませんでした。</Typography>
                    ) : (
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Chip label={`ユーザー ${stats.users_count}`} />
                            <Chip label={`チャンネル ${stats.channels_count}`} />
                            <Chip label={`限定公開 ${stats.private_channels_count}`} />
                            <Chip label={`メッセージ総数 ${stats.messages_count}`} />
                            <Chip label={`本日 ${stats.messages_today}`} color="primary" />
                            {stats.generated_at && (
                                <Typography variant="caption" color="text.secondary" sx={{ ml: 1, alignSelf: 'center' }}>
                                    更新: {new Date(stats.generated_at).toLocaleString()}
                                </Typography>
                            )}
                        </Stack>
                    )}
                </Paper>

                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="h6" mb={1}>ユーザー管理</Typography>

                    {loadingUsers ? (
                        <Stack alignItems="center" py={2}>
                            <CircularProgress size={24} />
                        </Stack>
                    ) : users.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                            ユーザーが見つかりません。
                        </Typography>
                    ) : (
                        <Stack spacing={1.5}>
                            {users.map((u) => {
                                const isAdmin = u.roles.includes('admin');
                                const isManager = u.roles.includes('manager');
                                const disabled = savingIds.has(u.id);
                                return (
                                    <Stack
                                        key={u.id}
                                        direction={{ xs: 'column', sm: 'row' }}
                                        spacing={1}
                                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                                        justifyContent="space-between"
                                        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}
                                    >
                                        <Typography variant="subtitle2">{u.name}</Typography>
                                        <Stack direction="row" spacing={2}>
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={isAdmin}
                                                        onChange={(e) => setRole(u.id, 'admin', e.target.checked)}
                                                        disabled={disabled}
                                                        color="primary"
                                                    />
                                                }
                                                label="管理者"
                                            />
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={isManager}
                                                        onChange={(e) => setRole(u.id, 'manager', e.target.checked)}
                                                        disabled={disabled}
                                                        color="primary"
                                                    />
                                                }
                                                label="マネージャー"
                                            />
                                        </Stack>
                                    </Stack>
                                );
                            })}
                        </Stack>
                    )}
                </Paper>

                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="h6">チャンネル管理</Typography>
                        <Button size="small" startIcon={<AddIcon />} onClick={createChannel}>新規チャンネル</Button>
                    </Stack>

                    {channelsLoading ? (
                        <Stack alignItems="center" py={2}>
                            <CircularProgress size={24} />
                        </Stack>
                    ) : channels.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">チャンネルがありません。</Typography>
                    ) : (
                        <Stack spacing={1.5}>
                            {channels.map((ch) => {
                                const editing = editingChannelId === ch.id;
                                return (
                                    <Stack
                                        key={ch.id}
                                        direction={{ xs: 'column', sm: 'row' }}
                                        spacing={1}
                                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                                        justifyContent="space-between"
                                        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}
                                    >
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                                            {editing ? (
                                                <>
                                                    <TextField
                                                        size="small"
                                                        value={editingChannelName}
                                                        onChange={(e) => setEditingChannelName(e.target.value)}
                                                        sx={{ maxWidth: 360 }}
                                                    />
                                                    <IconButton onClick={() => saveRename(ch)} aria-label="保存">
                                                        <SaveIcon />
                                                    </IconButton>
                                                    <IconButton onClick={() => { setEditingChannelId(null); setEditingChannelName(''); }} aria-label="キャンセル">
                                                        <CloseIcon />
                                                    </IconButton>
                                                </>
                                            ) : (
                                                <>
                                                    <Typography variant="subtitle2" noWrap>{ch.name}</Typography>
                                                    <IconButton size="small" onClick={() => startRename(ch)} aria-label="名称を編集">
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </>
                                            )}
                                            <Chip
                                                size="small"
                                                label={ch.is_private ? '限定公開' : '公開'}
                                                color={ch.is_private ? 'warning' : 'default'}
                                                sx={{ ml: 1 }}
                                            />
                                        </Stack>

                                        <Stack direction="row" spacing={1}>
                                            <IconButton onClick={() => togglePrivate(ch)} aria-label="公開設定を切替">
                                                {ch.is_private ? <LockIcon /> : <LockOpenIcon />}
                                            </IconButton>
                                            <Button
                                                size="small"
                                                onClick={() => openMembers(ch)}
                                                disabled={!ch.is_private}
                                            >
                                                メンバー
                                            </Button>
                                            <IconButton onClick={() => deleteChannel(ch)} color="error" aria-label="削除">
                                                <DeleteForeverIcon />
                                            </IconButton>
                                        </Stack>
                                    </Stack>
                                );
                            })}
                        </Stack>
                    )}
                </Paper>
            </Stack>

            {/* メンバー管理ダイアログ */}
            <Dialog open={membersOpen} onClose={() => setMembersOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>チャンネルのメンバー管理</DialogTitle>
                <DialogContent dividers>
                    {membersLoading ? (
                        <Stack alignItems="center" py={2}>
                            <CircularProgress size={24} />
                        </Stack>
                    ) : (
                        <FormGroup>
                            <List dense>
                                {users.map((u) => (
                                    <ListItemButton
                                        key={u.id}
                                        onClick={() =>
                                            setMembersIds((prev) =>
                                                prev.includes(u.id) ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                                            )
                                        }
                                    >
                                        <Checkbox
                                            edge="start"
                                            tabIndex={-1}
                                            disableRipple
                                            checked={membersIds.includes(u.id)}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                setMembersIds((prev) =>
                                                    checked ? Array.from(new Set([...prev, u.id])) : prev.filter((id) => id !== u.id)
                                                );
                                            }}
                                        />
                                        <ListItemText primary={u.name} />
                                    </ListItemButton>
                                ))}
                            </List>
                        </FormGroup>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setMembersOpen(false)}>閉じる</Button>
                    <Button variant="contained" onClick={saveMembers} disabled={membersLoading || !membersChannelId}>
                        保存
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={toast.open}
                autoHideDuration={2500}
                onClose={() => setToast((t) => ({ ...t, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={toast.sev} variant="filled" sx={{ width: '100%' }}>
                    {toast.msg}
                </Alert>
            </Snackbar>
        </Container>
    );
}
