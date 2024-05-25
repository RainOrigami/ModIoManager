import {
  Card,
  CardMedia,
  Chip,
  ImageListItem,
  ListItemText,
  Stack,
  Typography
} from '@mui/material';
import { Mod } from '@renderer/models/mod-io/Mod';

type Props = {
  mod: Mod;
  downloadSingle: (mod: Mod) => void;
};

function ModCard({ mod, downloadSingle }: Props): JSX.Element {
  return (
    <>
      <Card
        variant="outlined"
        sx={{
          p: 2,
          width: { xs: '100%', sm: 'auto' },
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: 'start',
          gap: 2,
          backgroundColor: 'primary.main'
        }}
      >
        <CardMedia
          component="img"
          width="320"
          height="180"
          alt={mod.name}
          src={mod.logo.thumb_320x180}
          sx={{
            width: { xs: '100%', sm: 320 }
          }}
        />
        <Stack direction="column" alignItems="start" spacing={1} useFlexGap>
          <div>
            <Typography color="text.primary" fontWeight="semiBold" variant="h6">
              {mod.name}
            </Typography>
          </div>
          <Stack direction="row" alignItems="start" spacing={1}>
            <Chip
              label="Installed"
              color={mod.local_version != 0 ? 'success' : 'error'}
              size="small"
            />
            <Chip label="Subscribed" color={mod.subscribed ? 'success' : 'error'} size="small" />
            <Chip
              label={mod.local_broken ? 'Broken' : 'Not broken'}
              color={mod.local_broken ? 'error' : 'success'}
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
              size="small"
            />
          </Stack>
        </Stack>
      </Card>
    </>
  );
}

export default ModCard;
