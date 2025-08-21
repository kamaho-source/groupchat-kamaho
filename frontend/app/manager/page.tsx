'use client';

import React from 'react';
import { Box, Container, Typography, Paper, Stack, CircularProgress, Button, TextField, IconButton, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Checkbox, FormGroup, List, ListItemButton, ListItemText, Snackbar, Alert } from '@mui/material';
import { useRouter } from 'next/navigation';
import axios from '@/lib/axios';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';

export default function ManagerDashboardPage() {
    const router = useRouter();
    const [checking, setChecking] = React.useState(true);
    const [authorized, setAuthorized] = React.useState(false);
    const [channels, setChannels] = React.useState<{ id: number; name: string; is_private?: boolean }[]>([]);
    const [channelsLoading, setChannelsLoading] = React.useState(true);
    const [editingChannelId, setEditingChannelId] = React.useState<number | null>(null);
    const [editingChannelName, setEditingChannelName] = React.useState<string>('');
    const [membersOpen, setMembersOpen] = React.useState(false);
    const [membersLoading, setMembersLoading] = React.useState(false);
    const [membersChannelId, setMembersChannelId] = React.useState<number | null>(null);
    const [membersIds, setMembersIds] = React.useState<number[]>([]);
    const [users, setUsers] = React.useState<{ id: number; name: string }[]>([]);
    const [toast, setToast] = React.useState<{ open: boolean; msg: string; sev: 'success' | 'info' | 'warning' | 'error' }>({ open: false, msg: '', sev: 'info' });

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
                const isManager =
                    data?.role === 'manager' ||
                    (Array.isArray(data?.roles) && data.roles.includes('manager'));
                const ok = isAdmin || isManager;
                if (mounted) {
                    setAuthorized(Boolean(ok));
                    if (!ok) router.replace('/');
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
            setChannelsLoading(true);
            try {
                const cres = await axios.get('/api/channels', { params: { _: Date.now() } });
                const list = Array.isArray(cres.data) ? cres.data : [];
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

    const startRename = (ch: { id: number; name: string }) => {
        setEditingChannelId(ch.id);
        setEditingChannelName(ch.name);
    };
    const saveRename = async (ch: { id: number; name: string }) => {
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
    const togglePrivate = async (ch: { id: number; name: string; is_private?: boolean }) => {
        try {
            const nextPrivate = !ch.is_private;
            await axios.put(`/api/channels/${ch.id}/privacy`, {
                is_private: nextPrivate,
                member_ids: [],
            });
            setChannels((prev) => prev.map((c) => (c.id === ch.id ? { ...c, is_private: nextPrivate } : c)));
            setToast({ open: true, msg: `チャンネルを${nextPrivate ? '限定公開' : '公開'}に変更しました。`, sev: 'success' });
        } catch {
            setToast({ open: true, msg: '公開設定の更新に失敗しました。', sev: 'error' });
        }
    };
    const openMembers = async (ch: { id: number; name: string }) => {
        setMembersOpen(true);
        setMembersChannelId(ch.id);
        setMembersLoading(true);
        try {
            const res = await axios.get(`/api/channels/${ch.id}/members`);
            const ids: number[] = (res.data?.member_ids || []).map((n: any) => Number(n));
            setMembersIds(ids);
            // ユーザー一覧も取得
            const ures = await axios.get('/api/users');
            const ulist = Array.isArray(ures.data) ? ures.data : [];
            setUsers(ulist.map((u: any) => ({ id: Number(u.id), name: String(u.name) })));
        } catch {
            setMembersIds([]);
            setUsers([]);
            setToast({ open: true, msg: 'メンバーの取得に失敗しました。', sev: 'error' });
        } finally {
            setMembersLoading(false);
        }
    };
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

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" fontWeight={700}>マネージャーダッシュボード</Typography>
                <Button variant="outlined" onClick={() => router.push('/')}>ホームへ戻る</Button>
            </Stack>

            <Stack spacing={2}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="h6" mb={1}>運用状況</Typography>
                    <Typography variant="body2" color="text.secondary">
                        チャンネルの閲覧権限やメンバー調整、運用タスクの進捗を表示します。（必要に応じ拡張）
                    </Typography>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="h6" mb={1}>チャンネルアクセス管理</Typography>
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
                                        </Stack>
                                    </Stack>
                                );
                            })}
                        </Stack>
                    )}
                </Paper>
            </Stack>

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
