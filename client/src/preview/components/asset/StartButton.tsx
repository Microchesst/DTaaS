// filepath: /workspaces/DTaaS/client/src/preview/components/asset/StartButton.tsx
import * as React from 'react';
import { Button, CircularProgress } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { selectDigitalTwinByName } from 'preview/store/digitalTwin.slice';
import { handleStart } from 'preview/route/digitaltwins/execute/pipelineHandler';

interface StartButtonProps {
  assetName: string;
}

function StartButton({ assetName }: StartButtonProps) {
  const dispatch = useDispatch();
  const digitalTwin = useSelector(selectDigitalTwinByName(assetName));
  const [isStarting, setIsStarting] = React.useState(false);

  const startNewExecution = async () => {
    if (!digitalTwin) return;

    setIsStarting(true);
    await handleStart(digitalTwin, dispatch);
    setIsStarting(false);
  };

  return (
    <Button
      variant="contained"
      size="small"
      color="primary"
      disabled={isStarting}
      startIcon={
        isStarting ? <CircularProgress size={16} color="inherit" /> : null
      }
      onClick={startNewExecution}
    >
      New Execution
    </Button>
  );
}

export default StartButton;
