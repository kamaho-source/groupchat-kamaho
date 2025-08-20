'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from '@/lib/axios'

// Material UI
import {
    Container,
    Typography,
    Box,
    Stack,
    Alert,
    Card,
    CardContent,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    Avatar,
    Divider,
    IconButton,
    InputAdornment,
} from '@mui/material'
import type { SelectChangeEvent } from '@mui/material/Select'
import { LoadingButton } from '@mui/lab'
import * as MuiIcons from '@mui/icons-material'
import FolderIcon from '@mui/icons-material/Folder'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'

// -----------------------------
// Types & Constants
// -----------------------------

type Role = 'admin' | 'manager' | 'member' | 'viewer'

const ROLES: { label: string; value: Role }[] = [
    { label: '管理者', value: 'admin' },
    { label: 'マネージャー', value: 'manager' },
    { label: 'メンバー', value: 'member' },
    { label: '閲覧のみ', value: 'viewer' },
]

const ICON_OPTIONS = [
    'Folder',
    'AccountCircle',
    'Person',
    'Star',
    'Build',
    'Code',
    'School',
    'Group',
    'Badge',
    'WorkspacePremium',
] as const

// -----------------------------
// Component
// -----------------------------

export default function NewUserPage() {
    const router = useRouter()

    // 追加: ユーザーID
    const [userId, setUserId] = useState('')

    // フォーム状態（メール削除済み）
    const [fullName, setFullName] = useState('')
    const [role, setRole] = useState<Role>('member')
    const [password, setPassword] = useState('')
    const [passwordConfirm, setPasswordConfirm] = useState('')
    const [showPw, setShowPw] = useState(false)
    const [showPwConfirm, setShowPwConfirm] = useState(false)

    // アイコン（どちらか）
    const [iconName, setIconName] = useState<string>('') // Material Icons 名
    const [iconFile, setIconFile] = useState<File | null>(null) // 画像アップロード
    const [iconPreviewUrl, setIconPreviewUrl] = useState<string | null>(null)

    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // 画像プレビュー生成/破棄
    useEffect(() => {
        if (!iconFile) { setIconPreviewUrl(null); return }
        const url = URL.createObjectURL(iconFile)
        setIconPreviewUrl(url)
        return () => URL.revokeObjectURL(url)
    }, [iconFile])

    // プレビュー用 Avatar ノード
    const IconPreview = useMemo(() => {
        if (iconPreviewUrl) return <Avatar src={iconPreviewUrl} sx={{ width: 64, height: 64 }} />
        const Comp = (MuiIcons as any)[iconName] as React.ElementType | undefined
        if (Comp) {
            return (
                <Avatar sx={{ width: 64, height: 64 }}>
                    <Comp />
                </Avatar>
            )
        }
        return (
            <Avatar sx={{ width: 64, height: 64 }}>
                <FolderIcon />
            </Avatar>
        )
    }, [iconName, iconPreviewUrl])

    // 送信（メール関連を完全に除外 + ユーザーID必須）
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!userId || !fullName || !password) {
            setError('必須項目が未入力です（ユーザーID / 氏名 / パスワード）')
            return
        }
        if (password !== passwordConfirm) {
            setError('パスワードが一致しません')
            return
        }

        setSubmitting(true)
        try {
            if (iconFile) {
                // ファイルあり: multipart/form-data
                const form = new FormData()
                form.append('user_id', userId)
                form.append('name', fullName)
                form.append('role', role)
                form.append('password', password)
                form.append('avatar', iconFile) // バックエンドで受け取るキー名は適宜変更

                await axios.post('/api/users', form, { headers: { 'Content-Type': 'multipart/form-data' } })
            } else {
                // ファイルなし: JSON + icon_name
                await axios.post('/api/users', {
                    user_id: userId,
                    name: fullName,
                    role,
                    password,
                    icon_name: iconName || null,
                })
            }

            router.push('/users')
        } catch (err: any) {
            console.error(err)
            setError(err?.response?.data?.message || 'ユーザーの作成に失敗しました')
        } finally {
            setSubmitting(false)
        }
    }

    // ファイル input ID
    const fileInputId = 'user-avatar-upload-input'

    return (
        <Container maxWidth="sm" sx={{ py: 4 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
                ユーザー新規作成
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Card variant="outlined">
                <CardContent>
                    <Box component="form" noValidate onSubmit={handleSubmit}>
                        <Stack spacing={3}>
                            {/* ユーザーID */}
                            <TextField
                                label="ログイン用ユーザーID"
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                                required
                                fullWidth
                                inputProps={{ maxLength: 64 }}
                                helperText="英数字・記号を含むID（必要に応じて制約を追加してください）"
                            />

                            {/* 氏名 */}
                            <TextField
                                label="氏名"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                                fullWidth
                            />

                            {/* 役割 */}
                            <FormControl fullWidth>
                                <InputLabel id="role-select-label">権限ロール（管理者専用）</InputLabel>
                                <Select
                                    labelId="role-select-label"
                                    label="権限ロール（管理者専用）"
                                    value={role}
                                    onChange={(e: SelectChangeEvent<Role>) => setRole(e.target.value as Role)}
                                >
                                    {ROLES.map((r) => (
                                        <MenuItem key={r.value} value={r.value}>
                                            {r.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            {/* パスワード */}
                            <TextField
                                label="パスワード"
                                type={showPw ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                fullWidth
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => setShowPw((v) => !v)} edge="end" aria-label="パスワード表示切替">
                                                {showPw ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            {/* パスワード確認 */}
                            <TextField
                                label="パスワード（確認）"
                                type={showPwConfirm ? 'text' : 'password'}
                                value={passwordConfirm}
                                onChange={(e) => setPasswordConfirm(e.target.value)}
                                required
                                fullWidth
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => setShowPwConfirm((v) => !v)} edge="end" aria-label="パスワード表示切替">
                                                {showPwConfirm ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            {/* アイコン設定 */}
                            <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                    アイコン（選択 or 画像アップロード）
                                </Typography>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    {IconPreview}
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flex={1}>
                                        {/* Material Icons から選択 */}
                                        <FormControl fullWidth>
                                            <InputLabel id="icon-select-label">Material Icons から選択</InputLabel>
                                            <Select
                                                labelId="icon-select-label"
                                                label="Material Icons から選択"
                                                value={iconName}
                                                onChange={(e) => { setIconName(e.target.value as string); setIconFile(null) }}
                                            >
                                                <MenuItem value=""><em>未選択</em></MenuItem>
                                                {ICON_OPTIONS.map((name) => {
                                                    const Comp = (MuiIcons as any)[name] as React.ElementType
                                                    return (
                                                        <MenuItem key={name} value={name}>
                                                            <Stack direction="row" spacing={1} alignItems="center">
                                                                <Comp />
                                                                <span>{name}</span>
                                                            </Stack>
                                                        </MenuItem>
                                                    )
                                                })}
                                            </Select>
                                        </FormControl>

                                        <Divider flexItem orientation="vertical" sx={{ display: { xs: 'none', sm: 'block' } }} />

                                        {/* 画像アップロード */}
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <input id={fileInputId} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0] || null; setIconFile(f); if (f) setIconName('') }} />
                                            <label htmlFor={fileInputId}>
                                                <Button variant="outlined" component="span">画像をアップロード</Button>
                                            </label>
                                            {iconFile && (<Button color="inherit" onClick={() => setIconFile(null)}>クリア</Button>)}
                                        </Stack>
                                    </Stack>
                                </Stack>
                            </Box>

                            {/* フッター操作 */}
                            <Stack direction="row" spacing={2} justifyContent="flex-end">
                                <Button type="button" variant="text" onClick={() => router.push('/users')}>キャンセル</Button>
                                <LoadingButton type="submit" variant="contained" loading={submitting}>作成</LoadingButton>
                            </Stack>
                        </Stack>
                    </Box>
                </CardContent>
            </Card>
        </Container>
    )
}
