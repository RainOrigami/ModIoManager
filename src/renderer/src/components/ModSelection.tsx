import { SelectAll, Deselect, Flaky } from '@mui/icons-material';
import { ButtonGroup, Tooltip, Button } from '@mui/material';

type Props = {
  handleSelectAll: () => void;
  handleDeselectAll: () => void;
  handleInvertSelection: () => void;
};

function ModSelection({
  handleSelectAll,
  handleDeselectAll,
  handleInvertSelection
}: Props): JSX.Element {
  return (
    <ButtonGroup fullWidth>
      <Tooltip title="Select all">
        <Button variant="outlined" startIcon={<SelectAll />} onClick={handleSelectAll}>
          Select all
        </Button>
      </Tooltip>
      <Tooltip title="Deselect all">
        <Button variant="outlined" startIcon={<Deselect />} onClick={handleDeselectAll}>
          Deselect all
        </Button>
      </Tooltip>
      <Tooltip title="Invert selection">
        <Button variant="outlined" startIcon={<Flaky />} onClick={handleInvertSelection}>
          Invert selection
        </Button>
      </Tooltip>
    </ButtonGroup>
  );
}

export default ModSelection;
