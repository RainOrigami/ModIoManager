import { Box, Button, LinearProgress } from '@mui/material';
import { BatchItem } from '@renderer/models/BatchItem';

interface Props {
  batchItemActual: BatchItem | null;
  progressAbortController: AbortController;
  batchList: BatchItem[];
}

function Progress({ batchItemActual, progressAbortController, batchList }: Props): JSX.Element {
  if (batchItemActual !== null) {
    return (
      <>
        <Box>
          {batchList.slice(-5).map((item, index) => (
            <p key={index}>
              {item.message}: {item.percent}%
            </p>
          ))}
          <p>{batchItemActual.message}</p>
          <LinearProgress variant="determinate" value={batchItemActual.percent} />
          {batchItemActual.batchSize !== 0 ? (
            <p>
              Item {batchItemActual.currentIndex} of {batchItemActual.batchSize}
              <LinearProgress
                variant="determinate"
                value={(batchItemActual.currentIndex / batchItemActual.batchSize) * 100}
                color="secondary"
              />
            </p>
          ) : null}
          <Button onClick={() => progressAbortController.abort('User cancel')}>Cancel</Button>
        </Box>
      </>
    );
  } else {
    return <div>Nothing is happening</div>;
  }
}

export default Progress;
