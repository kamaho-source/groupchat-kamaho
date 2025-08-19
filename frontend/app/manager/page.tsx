'use client';

import React from 'react';
import { Box, Container, Typography, Paper, Stack, CircularProgress, Button } from '@mui/material';
import { useRouter } from 'next/navigation';
import axios from '@/lib/axios';

export default function ManagerDashboardPage() {
    const router = useRouter();
    const [checking, setChecking] = React.useState(true);
    const [authorized, setAuthorized] = React.useState(false);

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
                    <Typography variant="body2" color="text.secondary">
                        既存の「アクセス設定」機能と連携する管理 UI をここに配置してください。
                    </Typography>
                </Paper>
            </Stack>
        </Container>
    );
}
