'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
    Snackbar,
    CircularProgress,
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

type User = {
    id: string            // レコードID（数値/UUIDなど）
    user_id?: string      // ログインID（表示用）
    name: string
    role: Role
    icon_name?: string | null
    avatar_url?: string | null
}

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
// Component（編集ページ: メール未使用 / パスワードは管理者のみ・対象がメンバー/マネージャーの場合）
// -----------------------------

export default function EditUserPage() {
    const router = useRouter()
    const params = useParams() as { id?: string }
    const targetId = params?.id ?? ''

    // フォーム状態（メールは使用しない）
    const [userId, setUserId] = useState('') // 表示用（ログインID user_id / 編集不可推奨）
    const [recordId, setRecordId] = useState('') // APIパス用（レコードID id）
    const [fullName, setFullName] = useState('')
    const [role, setRole] = useState<Role>('member')

    // 現在ユーザーのロール（パスワード権限制御に使用）
    const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null)
    const canChangePassword = currentUserRole === 'admin' && (role === 'member' || role === 'manager')

    // パスワード変更（管理者・マネージャーのみ、任意）
    const [password, setPassword] = useState('')               // 任意（空なら変更しない）
    const [passwordConfirm, setPasswordConfirm] = useState('')
    const [showPw, setShowPw] = useState(false)
    const [showPwConfirm, setShowPwConfirm] = useState(false)

    // アイコン（どちらか）
    const [iconName, setIconName] = useState<string>('')          // Material Icons 名
    const [iconFile, setIconFile] = useState<File | null>(null)   // 画像アップロード
    const [iconPreviewUrl, setIconPreviewUrl] = useState<string | null>(null)

    const [submitting, setSubmitting] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
        open: false,
        message: '',
        severity: 'success',
    })

    // 画像プレビュー（ローカル選択時）
    useEffect(() => {
        if (!iconFile) return
        const url = URL.createObjectURL(iconFile)
        setIconPreviewUrl(url)
        return () => URL.revokeObjectURL(url)
    }, [iconFile])

    // 初期データ取得（現在ユーザーのロール取得 + 編集対象ユーザー取得）
    useEffect(() => {
        let mounted = true
        ;(async () => {
            try {
                setLoading(true)

                // 現在ユーザー（ロール取得 & id未指定なら自分のidに）
                let editId = targetId
                try {
                    const me = await axios.get<{ id: string; role?: Role }>('/api/user')
                    if (mounted) setCurrentUserRole((me.data?.role as Role) ?? null)
                    if (!editId) editId = me.data?.id || ''
                } catch {
                    // 無視（未認証や取得失敗時はロール不明のまま続行）
                }

                if (!editId) throw new Error('ユーザーIDが取得できませんでした')

                // 編集対象ユーザー
                const res = await axios.get<User>(`/api/users/${editId}`)
                if (!mounted) return
                const u = res.data
                setRecordId(u.id ?? '')
                setUserId(u.user_id ?? '') // 表示用（ログインID）
                setFullName(u.name ?? '')
                const safeRole: Role =
                    u.role === 'admin' || u.role === 'manager' || u.role === 'member' || u.role === 'viewer' ? u.role : 'member'
                setRole(safeRole)
                setIconName(u.icon_name || '')
                setIconPreviewUrl(u.avatar_url || null)
            } catch (e: any) {
                setError(e?.response?.data?.message || 'ユーザー情報の取得に失敗しました')
            } finally {
                setLoading(false)
            }
        })()
        return () => {
            mounted = false
        }
    }, [targetId])

    // プレビュー用 Avatar
    const IconPreview = useMemo(() => {
        if (iconPreviewUrl) return <Avatar src={iconPreviewUrl} sx={{ width: 64, height: 64 }} />
        const Comp = (MuiIcons as any)[iconName] as React.ElementType | undefined
        if (Comp) return (
            <Avatar sx={{ width: 64, height: 64 }}>
                <Comp />
            </Avatar>
        )
        return (
            <Avatar sx={{ width: 64, height: 64 }}>
                <FolderIcon />
            </Avatar>
        )
    }, [iconName, iconPreviewUrl])

    // 保存（プロフィールは独自API、パスワードは管理者/マネージャーのみ専用API）
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!fullName) {
            setError('氏名は必須です')
            return
        }

        const willChangePassword = canChangePassword && !!(password || passwordConfirm)
        if (willChangePassword) {
            if (password.length < 8) {
                setError('新しいパスワードは8文字以上で入力してください')
                return
            }
            if (password !== passwordConfirm) {
                setError('パスワードが一致しません')
                return
            }
        }

        setSubmitting(true)
        try {
            // 1) プロフィール（名前・権限・アイコン名 or 画像） — アプリ独自API
            if (iconFile) {
                const form = new FormData()
                form.append('name', fullName)
                form.append('role', role)
                form.append('avatar', iconFile)
                await axios.post(`/api/users/${recordId}`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
            } else {
                await axios.put(`/api/users/${recordId}`, { name: fullName, role, icon_name: iconName || null })
            }

            // 2) パスワード変更（管理者・マネージャーのみ、入力がある時）
            if (willChangePassword) {
                await axios.put(`/api/users/${recordId}/password`, {
                    new_password: password,
                    new_password_confirmation: passwordConfirm,
                })
            }

            setSnack({ open: true, message: 'ユーザー情報を更新しました。', severity: 'success' })
            setPassword('')
            setPasswordConfirm('')
        } catch (err: any) {
            const apiMsg = err?.response?.data?.message
            const firstErr = (() => {
                const errs = err?.response?.data?.errors
                if (!errs) return undefined
                const k = Object.keys(errs)[0]
                return Array.isArray(errs[k]) ? errs[k][0] : undefined
            })()
            setError(firstErr || apiMsg || '更新に失敗しました')
            setSnack({ open: true, message: '更新に失敗しました。', severity: 'error' })
        } finally {
            setSubmitting(false)
        }
    }

    // ファイル input ID
    const fileInputId = 'user-avatar-upload-input'

    return (
        <Container maxWidth="sm" sx={{ py: 4 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
                ユーザー情報 編集
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Card variant="outlined">
                <CardContent>
                    {loading ? (
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <CircularProgress size={20} />
                            <Typography>読み込み中…</Typography>
                        </Stack>
                    ) : (
                        <Box component="form" noValidate onSubmit={handleSubmit}>
                            <Stack spacing={3}>
                                {/* ユーザーID（編集不可） */}
                                <TextField label="ユーザーID" value={userId} fullWidth disabled />

                                {/* 氏名 */}
                                <TextField
                                    label="氏名"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                    fullWidth
                                />

                                {/* 権限（アプリ独自） */}
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

                                {/* パスワード変更（管理者・マネージャーのみ表示） */}
                                {canChangePassword && (
                                    <>
                                        <TextField
                                            label="新しいパスワード（空欄=変更しない）"
                                            type={showPw ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
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
                                            helperText="8文字以上。未入力なら変更しません。"
                                        />

                                        <TextField
                                            label="パスワード（確認）"
                                            type={showPwConfirm ? 'text' : 'password'}
                                            value={passwordConfirm}
                                            onChange={(e) => setPasswordConfirm(e.target.value)}
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
                                            helperText="確認のため再入力（変更時のみ）"
                                        />
                                    </>
                                )}

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
                                                    onChange={(e) => {
                                                        setIconName(e.target.value as string)
                                                        setIconFile(null)
                                                    }}
                                                >
                                                    <MenuItem value="">
                                                        <em>未選択</em>
                                                    </MenuItem>
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
                                                <input
                                                    id={fileInputId}
                                                    type="file"
                                                    accept="image/*"
                                                    hidden
                                                    onChange={(e) => {
                                                        const f = e.target.files?.[0] || null
                                                        setIconFile(f)
                                                        if (f) {
                                                            setIconName('')
                                                            setIconPreviewUrl(URL.createObjectURL(f))
                                                        }
                                                    }}
                                                />
                                                <label htmlFor={fileInputId}>
                                                    <Button variant="outlined" component="span">
                                                        画像をアップロード
                                                    </Button>
                                                </label>
                                                {iconFile && (
                                                    <Button
                                                        color="inherit"
                                                        onClick={() => {
                                                            setIconFile(null)
                                                            setIconPreviewUrl(null)
                                                        }}
                                                    >
                                                        クリア
                                                    </Button>
                                                )}
                                            </Stack>
                                        </Stack>
                                    </Stack>
                                </Box>

                                {/* フッター操作 */}
                                <Stack direction="row" spacing={2} justifyContent="flex-end">
                                    <Button type="button" variant="text" onClick={() => router.push('/')}>
                                        キャンセル
                                    </Button>
                                    <LoadingButton type="submit" variant="contained" loading={submitting}>
                                        保存
                                    </LoadingButton>
                                </Stack>
                            </Stack>
                        </Box>
                    )}
                </CardContent>
            </Card>

            <Snackbar
                open={snack.open}
                autoHideDuration={3500}
                onClose={() => setSnack((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={snack.severity} variant="filled" sx={{ width: '100%' }}>
                    {snack.message}
                </Alert>
            </Snackbar>
        </Container>
    )
}
