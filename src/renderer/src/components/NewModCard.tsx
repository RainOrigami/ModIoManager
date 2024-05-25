/// <reference types="vite-plugin-svgr/client" />

import {
  ExpandMore,
  Public,
  CalendarMonth,
  BookmarkRemove,
  BookmarkAdded,
  InstallDesktop,
  CloudSync,
  BrowserUpdated,
  Cached,
  RemoveCircleOutline
} from '@mui/icons-material';
import {
  Stack,
  Box,
  Checkbox,
  Accordion,
  AccordionSummary,
  Typography,
  Chip,
  AccordionDetails,
  Grid,
  Tooltip,
  Button,
  Avatar,
  Divider,
  ButtonGroup
} from '@mui/material';
import { Mod } from '@renderer/models/mod-io/Mod';
import moment from 'moment';
import ModioCogBlue from '/src/assets/modio-cog-blue.svg?react';

type Props = { mod: Mod; selected: boolean; onSelect: (mod: Mod) => void };

export const NewModCard = ({ mod, selected, onSelect }: Props): JSX.Element => {
  return (
    <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
      <Box>
        <Checkbox checked={selected} onChange={() => onSelect(mod)} />
      </Box>
      <Accordion sx={{ width: '100%' }} disableGutters>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Stack direction="column">
            <Stack direction="row">
              <Typography variant="h6" gutterBottom>
                {mod.name}
              </Typography>
            </Stack>
            <Stack direction="row" alignItems="start" spacing={1}>
              <Chip
                label="Installed"
                color="success"
                disabled={mod.local_version === 0}
                size="small"
              />
              <Chip label="Subscribed" color="success" disabled={!mod.subscribed} size="small" />
              <Chip
                label="Broken"
                color={mod.local_broken ? 'error' : 'success'}
                disabled={!mod.local_broken}
                size="small"
              />
              <Chip
                label="Update available"
                color={
                  mod.local_version !=
                  mod.platforms.find((p) => p.platform === 'windows')?.modfile_live
                    ? 'warning'
                    : 'default'
                }
                disabled={
                  mod.local_version ===
                  mod.platforms.find((p) => p.platform === 'windows')?.modfile_live
                }
                size="small"
              />
            </Stack>
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={1} sx={{ width: '100%' }}>
            <Grid item xs={12} sm="auto">
              <img src={mod.logo.thumb_320x180} loading="lazy" alt={mod.name} />
            </Grid>
            <Grid item xs={12} sm>
              <Tooltip title="Open Mod.io page">
                <Button
                  onClick={() => {
                    window.electron.ipcRenderer.send('open-external', mod.profile_url);
                  }}
                >
                  <ModioCogBlue width={24} height={24} />
                </Button>
              </Tooltip>
              <Tooltip title={`Open mod homepage ${mod.homepage_url ?? ''}`}>
                <span>
                  <Button
                    onClick={() => {
                      window.electron.ipcRenderer.send('open-external', mod.homepage_url);
                    }}
                    disabled={!mod.homepage_url}
                  >
                    <Public />
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title="Open Mod.io profile">
                <>
                  <Avatar
                    sx={{ width: 24, height: 24 }}
                    src={mod.submitted_by.avatar.thumb_50x50}
                    alt={mod.submitted_by.username}
                  />
                  <Button
                    variant="text"
                    onClick={() => {
                      window.electron.ipcRenderer.send(
                        'open-external',
                        mod.submitted_by.profile_url
                      );
                    }}
                  >
                    {mod.submitted_by.username}
                  </Button>
                </>
              </Tooltip>
              <Tooltip title={new Date(mod.date_updated * 1000).toLocaleString()}>
                <>
                  <CalendarMonth />
                  {((text: string): string => {
                    return text.charAt(0).toUpperCase() + text.slice(1);
                  })(moment(new Date(mod.date_updated * 1000)).fromNow())}
                </>
              </Tooltip>
            </Grid>
            <Grid item xs={12} sm="auto">
              <Box sx={{ minWidth: 160, maxWidth: 250 }}>
                <Button
                  startIcon={mod.subscribed ? <BookmarkRemove /> : <BookmarkAdded />}
                  color={mod.subscribed ? 'inherit' : 'primary'}
                  variant={mod.subscribed ? 'outlined' : 'contained'}
                  sx={{ width: '100%' }}
                >
                  {mod.subscribed ? 'Unsubscribe' : 'Subscribe'}
                </Button>
                <Divider sx={{ paddingY: 1 }} />
                <ButtonGroup orientation="vertical" sx={{ width: '100%' }}>
                  {mod.local_version === 0 ? (
                    <Button variant="outlined" color="primary" startIcon={<InstallDesktop />}>
                      Install
                    </Button>
                  ) : mod.local_version ==
                    mod.platforms.find((p) => p.platform === 'windows')?.modfile_live ? (
                    <Button variant="outlined" color="warning" startIcon={<CloudSync />}>
                      Reinstall
                    </Button>
                  ) : (
                    <Button variant="outlined" color="success" startIcon={<BrowserUpdated />}>
                      Update
                    </Button>
                  )}
                </ButtonGroup>
                <Divider sx={{ paddingY: 1 }} />
                <Button
                  variant="outlined"
                  color="primary"
                  sx={{ width: '100%' }}
                  startIcon={<Cached />}
                >
                  Refresh metadata
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  disabled={mod.local_version === 0}
                  sx={{ width: '100%' }}
                  startIcon={<RemoveCircleOutline />}
                >
                  Uninstall
                </Button>
              </Box>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Stack>
  );
};
