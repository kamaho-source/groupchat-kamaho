// app/providers.tsx
'use client';

import * as React from 'react';
import {
    ThemeProvider,
    CssBaseline,
    createTheme,
    useMediaQuery,
    Drawer,
    IconButton,
    Box,
    Stack,
    Typography,
    Divider,
    ToggleButtonGroup,
    ToggleButton,
    TextField,
    Button,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';

type ModeSetting = 'light' | 'dark' | 'system';

type ThemeSettings = {
    mode: ModeSetting;     // 既定は 'light'（OSに同調しない）
    bgColor: string;       // 背景色
    primary: string;       // プライマリカラー
};

const DEFAULT_SETTINGS: ThemeSettings = {
    mode: 'light',
    bgColor: '#ffffff',
    primary: '#1976d2', // MUI default blue
};

const STORAGE_KEY = 'app-theme-settings';

const ThemeSettingsContext = React.createContext<{
    settings: ThemeSettings;
    setSettings: React.Dispatch<React.SetStateAction<ThemeSettings>>;
} | null>(null);

export function useThemeSettings() {
    const ctx = React.useContext(ThemeSettingsContext);
    if (!ctx) throw new Error('useThemeSettings must be used within Providers');
    return ctx;
}

function ThemeSettingsButton() {
    const { settings, setSettings } = useThemeSettings();
    const [open, setOpen] = React.useState(false);

    const systemPrefersDark = useMediaQuery('(prefers-color-scheme: dark)', { noSsr: true });

    const resolvedMode =
        settings.mode === 'system' ? (systemPrefersDark ? 'dark' : 'light') : settings.mode;

    const presetColors = [
        '#1976d2', // blue
        '#1e88e5', // blue (slightly different)
        '#2e7d32', // green
        '#d32f2f', // red
        '#6a1b9a', // purple
        '#ed6c02', // orange
        '#455a64', // blue grey
    ];

    return (
        <>
            {/* 右下の小さな設定ボタン（全ページ共通） */}
            <IconButton
                aria-label="テーマ設定"
                onClick={() => setOpen(true)}
                sx={{
                    position: 'fixed',
                    right: 16,
                    bottom: 16,
                    zIndex: (t) => t.zIndex.drawer + 1,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: 2,
                    '&:hover': { bgcolor: 'background.paper' },
                }}
            >
                <SettingsIcon />
            </IconButton>

            <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
                <Box sx={{ width: 360, p: 2 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                        <Typography variant="h6">表示設定</Typography>
                        <IconButton onClick={() => setOpen(false)} aria-label="閉じる">
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                    <Divider sx={{ mb: 2 }} />

                    {/* 配色モード */}
                    <Typography variant="subtitle2" gutterBottom>配色モード</Typography>
                    <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={settings.mode}
                        onChange={(_, v: ModeSetting | null) => {
                            if (!v) return;
                            setSettings((s) => ({ ...s, mode: v }));
                        }}
                        sx={{ mb: 2 }}
                    >
                        <ToggleButton value="light">ライト</ToggleButton>
                        <ToggleButton value="dark">ダーク</ToggleButton>
                        <ToggleButton value="system">OSに合わせる</ToggleButton>
                    </ToggleButtonGroup>

                    {/* 背景色 */}
                    <Typography variant="subtitle2" gutterBottom>背景色</Typography>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                        <Box
                            sx={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                border: '1px solid',
                                borderColor: 'divider',
                                bgcolor: settings.bgColor,
                            }}
                        />
                        <TextField
                            type="color"
                            value={settings.bgColor}
                            onChange={(e) => setSettings((s) => ({ ...s, bgColor: e.target.value }))}
                            size="small"
                            sx={{ width: 80 }}
                            inputProps={{ 'aria-label': '背景色' }}
                        />
                        <Button
                            size="small"
                            onClick={() => setSettings((s) => ({ ...s, bgColor: DEFAULT_SETTINGS.bgColor }))}
                        >
                            既定に戻す
                        </Button>
                    </Stack>

                    {/* プライマリカラー */}
                    <Typography variant="subtitle2" gutterBottom>プライマリカラー</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                        {presetColors.map((c) => (
                            <Box
                                key={c}
                                onClick={() => setSettings((s) => ({ ...s, primary: c }))}
                                role="button"
                                aria-label={`カラー ${c}`}
                                tabIndex={0}
                                sx={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: '50%',
                                    border: '2px solid',
                                    borderColor: settings.primary === c ? 'text.primary' : 'transparent',
                                    bgcolor: c,
                                    cursor: 'pointer',
                                }}
                            />
                        ))}
                    </Stack>

                    <Button
                        variant="outlined"
                        fullWidth
                        onClick={() => setSettings(DEFAULT_SETTINGS)}
                    >
                        すべて既定に戻す
                    </Button>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="caption" color="text.secondary">
                        ※ 既定は「ライト」です。夜間でも自動でダークには切り替わりません。必要に応じて本画面から切り替えてください。
                    </Typography>
                </Box>
            </Drawer>
        </>
    );
}

export default function Providers({ children }: { children: React.ReactNode }) {
    // 設定の復元
    const [settings, setSettings] = React.useState<ThemeSettings>(DEFAULT_SETTINGS);
    const [ready, setReady] = React.useState(false);

    React.useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw) as Partial<ThemeSettings>;
                setSettings({ ...DEFAULT_SETTINGS, ...parsed });
            }
        } catch {}
        setReady(true);
    }, []);

    // 保存
    React.useEffect(() => {
        if (!ready) return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }, [settings, ready]);

    const systemPrefersDark = useMediaQuery('(prefers-color-scheme: dark)', { noSsr: true });
    const resolvedMode: 'light' | 'dark' =
        settings.mode === 'system' ? (systemPrefersDark ? 'dark' : 'light') : settings.mode;

    const theme = React.useMemo(
        () =>
            createTheme({
                palette: {
                    mode: resolvedMode,             // 既定は 'light'（OSに同調しない）
                    primary: { main: settings.primary },
                },
                shape: { borderRadius: 12 },
                components: {
                    MuiCssBaseline: {
                        styleOverrides: {
                            // 全ページの背景をユーザー指定色に
                            html: { backgroundColor: settings.bgColor },
                            body: {
                                backgroundColor: settings.bgColor,
                                transition: 'background-color .2s ease',
                            },
                            // UA の自動配色影響を避けたい場合は 'color-scheme: light' を固定
                            ':root': { colorScheme: 'light' },
                        },
                    },
                },
            }),
        [resolvedMode, settings.primary, settings.bgColor]
    );

    return (
        <ThemeSettingsContext.Provider value={{ settings, setSettings }}>
            <ThemeProvider theme={theme}>
                {/* OS 連動は行わないため enableColorScheme は false に */}
                <CssBaseline enableColorScheme={false} />
                {children}
                {/* グローバル設定ボタン */}
                {ready && <ThemeSettingsButton />}
            </ThemeProvider>
        </ThemeSettingsContext.Provider>
    );
}
