// app/settings/page.tsx
'use client';

import * as React from 'react';
import {
    Container,
    Box,
    Paper,
    Stack,
    Typography,
    Divider,
    ToggleButtonGroup,
    ToggleButton,
    TextField,
    Button,
    Card,
    CardContent,
    CardActions,
    Chip,
    Tooltip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CheckIcon from '@mui/icons-material/Check';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useThemeSettings } from '../providers'; // ← app/providers.tsx の Context/Hook を利用

const PRESET_BG = [
    '#ffffff',
    '#f7f9fc',
    '#f5f5f7',
    '#fafafa',
    '#fffefd',
];

const PRESET_PRIMARY = [
    '#1976d2', // blue
    '#1e88e5', // blue (variant)
    '#2e7d32', // green
    '#d32f2f', // red
    '#6a1b9a', // purple
    '#ed6c02', // orange
    '#455a64', // blue grey
];

export default function SettingsPage() {
    const theme = useTheme();
    const { settings, setSettings } = useThemeSettings();

    // 既定値（providers.tsx の DEFAULT_SETTINGS と揃えてください）
    const DEFAULTS = React.useMemo(
        () => ({ mode: 'light' as const, bgColor: '#ffffff', primary: '#1976d2' }),
        []
    );

    const handleMode = (_: any, v: 'light' | 'dark' | 'system' | null) => {
        if (!v) return;
        setSettings((s) => ({ ...s, mode: v }));
    };

    const handleBg = (color: string) => {
        setSettings((s) => ({ ...s, bgColor: color }));
    };

    const handlePrimary = (color: string) => {
        setSettings((s) => ({ ...s, primary: color }));
    };

    const handleResetAll = () => {
        setSettings(DEFAULTS);
    };

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Stack spacing={3}>
                <Box>
                    <Typography variant="h4" fontWeight={700} gutterBottom>
                        画面設定
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        既定は<strong>ライト</strong>です（夜間でも自動でダークには切り替わりません）。ここでは背景色や配色を自由にカスタマイズできます。設定は自動的に保存され、全ページに適用されます。
                    </Typography>
                </Box>

                <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                    <Stack spacing={2}>
                        <Typography variant="subtitle1" fontWeight={600}>
                            配色モード
                        </Typography>
                        <ToggleButtonGroup
                            value={settings.mode}
                            exclusive
                            onChange={handleMode}
                            size="small"
                            sx={{ width: 'fit-content' }}
                        >
                            <ToggleButton value="light">ライト</ToggleButton>
                            <ToggleButton value="dark">ダーク</ToggleButton>
                            <ToggleButton value="system">OSに合わせる</ToggleButton>
                        </ToggleButtonGroup>
                        <Typography variant="caption" color="text.secondary">
                            ※ 「OSに合わせる」を選ぶと、端末の設定（ダーク/ライト）に追従します。既定はライトです。
                        </Typography>
                    </Stack>
                </Paper>

                <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                    <Stack spacing={2}>
                        <Typography variant="subtitle1" fontWeight={600}>
                            背景色
                        </Typography>

                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                            {PRESET_BG.map((c) => (
                                <Tooltip title={c} key={c}>
                                    <Button
                                        onClick={() => handleBg(c)}
                                        variant={settings.bgColor === c ? 'contained' : 'outlined'}
                                        size="small"
                                        sx={{
                                            minWidth: 40,
                                            height: 40,
                                            p: 0,
                                            borderRadius: '50%',
                                            borderColor: 'divider',
                                            bgcolor: c,
                                            color: theme.palette.getContrastText(c),
                                            boxShadow: settings.bgColor === c ? 1 : 0,
                                        }}
                                    >
                                        {settings.bgColor === c ? <CheckIcon fontSize="small" /> : null}
                                    </Button>
                                </Tooltip>
                            ))}
                            <TextField
                                type="color"
                                value={settings.bgColor}
                                onChange={(e) => handleBg(e.target.value)}
                                size="small"
                                sx={{ width: 68, height: 40 }}
                                inputProps={{ 'aria-label': '背景色を選択' }}
                            />
                            <Chip
                                label="既定に戻す"
                                onClick={() => handleBg(DEFAULTS.bgColor)}
                                size="small"
                                variant="outlined"
                            />
                        </Stack>
                    </Stack>
                </Paper>

                <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                    <Stack spacing={2}>
                        <Typography variant="subtitle1" fontWeight={600}>
                            プライマリカラー
                        </Typography>

                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                            {PRESET_PRIMARY.map((c) => (
                                <Tooltip title={c} key={c}>
                                    <Button
                                        onClick={() => handlePrimary(c)}
                                        variant={settings.primary === c ? 'contained' : 'outlined'}
                                        size="small"
                                        sx={{
                                            minWidth: 40,
                                            height: 40,
                                            p: 0,
                                            borderRadius: '50%',
                                            borderColor: 'divider',
                                            bgcolor: c,
                                            color: theme.palette.getContrastText(c),
                                            boxShadow: settings.primary === c ? 1 : 0,
                                        }}
                                    >
                                        {settings.primary === c ? <CheckIcon fontSize="small" /> : null}
                                    </Button>
                                </Tooltip>
                            ))}
                            <TextField
                                type="color"
                                value={settings.primary}
                                onChange={(e) => handlePrimary(e.target.value)}
                                size="small"
                                sx={{ width: 68, height: 40 }}
                                inputProps={{ 'aria-label': 'プライマリカラーを選択' }}
                            />
                            <Chip
                                label="既定に戻す"
                                onClick={() => handlePrimary(DEFAULTS.primary)}
                                size="small"
                                variant="outlined"
                            />
                        </Stack>
                    </Stack>
                </Paper>

                <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                    <Stack spacing={2}>
                        <Typography variant="subtitle1" fontWeight={600}>
                            プレビュー
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            現在の設定がどのように見えるかの簡易プレビューです。
                        </Typography>

                        <Card
                            variant="outlined"
                            sx={{
                                borderRadius: 2,
                                bgcolor: settings.bgColor,
                                borderColor: 'divider',
                            }}
                        >
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    鎌倉児童ホーム チャット
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    プライマリカラーはボタンやリンク、強調 UI に適用されます。
                                </Typography>
                            </CardContent>
                            <CardActions>
                                <Button variant="contained">保存</Button>
                                <Button variant="outlined">キャンセル</Button>
                                <Chip label="情報" color="primary" variant="outlined" />
                            </CardActions>
                        </Card>
                    </Stack>
                </Paper>

                <Box display="flex" gap={1} justifyContent="flex-end">
                    <Button
                        startIcon={<RestartAltIcon />}
                        color="inherit"
                        onClick={handleResetAll}
                    >
                        すべて既定に戻す
                    </Button>
                </Box>

                <Divider />

                <Typography variant="caption" color="text.secondary" align="right">
                    設定は自動保存され、全ページに反映されます。
                </Typography>
            </Stack>
        </Container>
    );
}
