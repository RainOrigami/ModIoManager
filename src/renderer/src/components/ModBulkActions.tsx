import { InstallDesktop, CloudSync, Cached, RemoveCircleOutline } from '@mui/icons-material';
import { ButtonGroup, Tooltip, Button } from '@mui/material';
import { Mod } from '@renderer/models/mod-io/Mod';

type Props = {
  selectedMods: Mod[];
};

function ModBulkActions({ selectedMods }: Props): JSX.Element {
  return (
    <ButtonGroup fullWidth>
      <Tooltip title="Install selected mods">
        <Button
          variant="outlined"
          startIcon={<InstallDesktop />}
          disabled={selectedMods.length == 0}
          color="success"
        >
          Install
        </Button>
      </Tooltip>
      <Tooltip title="Update or reinstall selected mods">
        <Button
          variant="outlined"
          startIcon={<CloudSync />}
          disabled={selectedMods.length == 0}
          color="success"
        >
          Update
        </Button>
      </Tooltip>
      <Tooltip title="Refresh metadata of selected mods">
        <Button variant="outlined" startIcon={<Cached />} disabled={selectedMods.length == 0}>
          Refresh metadata
        </Button>
      </Tooltip>
      <Tooltip title="Uninstall selected mods">
        <Button
          variant="outlined"
          startIcon={<RemoveCircleOutline />}
          disabled={selectedMods.length == 0}
          color="error"
        >
          Uninstall
        </Button>
      </Tooltip>
    </ButtonGroup>
  );
}

export default ModBulkActions;
