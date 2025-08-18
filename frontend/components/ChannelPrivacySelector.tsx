'use client';

import React from 'react';
import {
  Box,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Typography,
  Stack,
} from '@mui/material';

export type ChannelPrivacySelectorProps = {
  // true = 限定公開（プライベート）, false = 全公開
  isPrivate: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label?: string;
  helperTextPublic?: string;
  helperTextPrivate?: string;
  row?: boolean;
};

const ChannelPrivacySelector: React.FC<ChannelPrivacySelectorProps> = ({
  isPrivate,
  onChange,
  disabled,
  label = '公開範囲',
  helperTextPublic = '全ユーザーが閲覧できます',
  helperTextPrivate = '選択したユーザーのみ閲覧できます',
  row = false,
}) => {
  const value = isPrivate ? 'private' : 'public';

  return (
    <FormControl component="fieldset" disabled={disabled} fullWidth>
      <FormLabel component="legend">{label}</FormLabel>
      <RadioGroup
        row={row}
        value={value}
        onChange={(e) => onChange(e.target.value === 'private')}
        name="channel-privacy"
      >
        <FormControlLabel
          value="public"
          control={<Radio />}
          label={
            <Stack spacing={0} sx={{ lineHeight: 1 }}>
              <Typography>全公開</Typography>
              <Typography variant="caption" color="text.secondary">
                {helperTextPublic}
              </Typography>
            </Stack>
          }
        />
        <FormControlLabel
          value="private"
          control={<Radio />}
          label={
            <Stack spacing={0} sx={{ lineHeight: 1 }}>
              <Typography>限定公開</Typography>
              <Typography variant="caption" color="text.secondary">
                {helperTextPrivate}
              </Typography>
            </Stack>
          }
        />
      </RadioGroup>
    </FormControl>
  );
};

export default ChannelPrivacySelector;
