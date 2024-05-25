import { Mod } from '@renderer/models/mod-io/Mod';
import ModCard from './ModCard';
import { Stack } from '@mui/material';

type Props = {
  mods: Mod[];
  downloadSingle: (mod: Mod) => void;
};

function ModList({ mods, downloadSingle }: Props): JSX.Element {
  return (
    <Stack direction="column" alignItems="left" spacing={1} useFlexGap margin={1}>
      {mods.map((mod) => (
        <ModCard key={mod.id} mod={mod} downloadSingle={downloadSingle} />
      ))}
    </Stack>
  );
}

export default ModList;
