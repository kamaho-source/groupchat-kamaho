'use client';

import React from 'react';
import { Box, Container, Typography, Paper, Stack, CircularProgress, Button, FormControlLabel, Switch, Snackbar, Alert } from '@mui/material';
import { useRouter } from 'next/navigation';
import axios from '@/lib/axios';

export default function AdminDashboardPage() {
    const router = useRouter();
    const [checking, setChecking] = React.useState(true);
    const [authorized, setAuthorized] = React.useState(false);

    type AdminUser = { id: number; name: string; roles: string[] };

    const [users, setUsers] = React.useState<AdminUser[]>([]);
    const [loadingUsers, setLoadingUsers] = React.useState(true);
    const [savingIds, setSavingIds] = React.useState<Set<number>>(new Set());
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
                    <Typography variant="body2" color="text.secondary">
                        ここに各種メトリクスや利用状況を表示します。（実装の必要に応じて拡張）
                    </Typography>
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
                    <Typography variant="h6" mb={1}>チャンネル管理</Typography>
                    <Typography variant="body2" color="text.secondary">
                        チャンネルの作成/削除、公開・非公開切替、メンバー設定などをここに配置します。
                    </Typography>
                </Paper>
            </Stack>

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
