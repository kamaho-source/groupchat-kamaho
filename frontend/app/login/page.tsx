// app/login/page.tsx
'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import { useAuth } from '@/lib/auth';

import {
    Container,
    Box,
    Paper,
    Stack,
    Typography,
    TextField,
    InputAdornment,
    IconButton,
    Alert,
    Button,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import {
    Person as PersonIcon,
    Lock as LockIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';

export default function LoginPage() {
    const router = useRouter();
    const { login, authenticated } = useAuth();

    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [mounted, setMounted] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // 既に認証済みの場合はリダイレクト
    useEffect(() => {
        if (authenticated) {
            router.replace('/');
        }
    }, [authenticated, router]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const result = await login(identifier, password);
            
            if (result.success) {
                router.replace('/');
            } else {
                setError(result.message);
            }
        } catch (err: any) {
            setError('ログインに失敗しました');
        } finally {
            setLoading(false);
        }
    };

    if (!mounted) return null;

    return (
        <Container maxWidth="xs">
            <Box
                sx={{
                    minHeight: '100vh',
                    display: 'grid',
                    placeItems: 'center',
                }}
            >
                <Paper
                    component="form"
                    onSubmit={handleSubmit}
                    elevation={3}
                    sx={{ width: '100%', p: 3, borderRadius: 2 }}
                >
                    <Stack spacing={2.5}>
                        <Typography variant="h5" align="center" fontWeight={600}>
                            ログイン
                        </Typography>

                        <TextField
                            id="identifier"
                            name="user_id"
                            label="ユーザーID"
                            placeholder="例）kamakura123"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            autoComplete="username"
                            required
                            disabled={loading}
                            fullWidth
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <PersonIcon fontSize="small" />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <TextField
                            id="password"
                            name="password"
                            label="パスワード"
                            type={showPwd ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            required
                            disabled={loading}
                            fullWidth
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <LockIcon fontSize="small" />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label={showPwd ? 'パスワードを隠す' : 'パスワードを表示'}
                                            onClick={() => setShowPwd((v) => !v)}
                                            edge="end"
                                            size="small"
                                        >
                                            {showPwd ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <Stack direction="column" spacing={1.5}>
                            <LoadingButton
                                type="submit"
                                loading={loading}
                                variant="contained"
                                size="large"
                            >
                                ログイン
                            </LoadingButton>

                            <Button
                                component={NextLink}
                                href="/users/new"
                                variant="outlined"
                                size="large"
                            >
                                新規登録
                            </Button>
                        </Stack>
                    </Stack>
                </Paper>
            </Box>
        </Container>
    );
}
