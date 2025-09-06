// filepath: /workspaces/DTaaS/client/src/preview/components/asset/StopButton.tsx
import * as React from 'react';
import { Button, CircularProgress } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { selectDigitalTwinByName } from 'preview/store/digitalTwin.slice';
import { handleStop } from 'preview/route/digitaltwins/execute/pipelineHandler';

interface StopButtonProps {
  assetName: string;
  executionId: string;
}

function StopButton({ assetName, executionId }: StopButtonProps) {
  const dispatch = useDispatch();
  const digitalTwin = useSelector(selectDigitalTwinByName(assetName));
  const [isStopping, setIsStopping] = React.useState(false);

  const stopExecution = async () => {
    if (!digitalTwin) return;

    setIsStopping(true);
    await handleStop(digitalTwin, executionId, dispatch);
    setIsStopping(false);
  };

  return (
    <Button
      variant="outlined"
      size="small"
      color="error"
      disabled={isStopping}
      startIcon={
        isStopping ? <CircularProgress size={16} color="inherit" /> : null
      }
      onClick={stopExecution}
    >
      Stop
    </Button>
  );
}

export default StopButton;
