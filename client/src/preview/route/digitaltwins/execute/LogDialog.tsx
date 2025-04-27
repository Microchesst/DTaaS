import * as React from 'react';
import { Dispatch, SetStateAction, useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
} from '@mui/material';
import { useSelector } from 'react-redux';
import { selectDigitalTwinByName } from 'preview/store/digitalTwin.slice';
import { formatName } from 'preview/util/digitalTwin';
import { JobLog } from 'preview/components/asset/StartStopButton';

interface LogDialogProps {
  showLog: boolean;
  setShowLog: Dispatch<SetStateAction<boolean>>;
  name: string;
  selectedExecutionId?: string | null;
}

const handleCloseLog = (setShowLog: Dispatch<SetStateAction<boolean>>) => {
  setShowLog(false);
};

function LogDialog({
  showLog,
  setShowLog,
  name,
  selectedExecutionId,
}: LogDialogProps) {
  const digitalTwin = useSelector(selectDigitalTwinByName(name));
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(
    null,
  );
  const [currentLogs, setCurrentLogs] = useState<JobLog[]>([]);

  // Initialize with the selected execution or current execution
  useEffect(() => {
    if (showLog) {
      if (selectedExecutionId) {
        setCurrentExecutionId(selectedExecutionId);
      } else if (digitalTwin?.currentExecutionId) {
        setCurrentExecutionId(digitalTwin.currentExecutionId);
      } else if (digitalTwin?.executions?.length > 0) {
        setCurrentExecutionId(digitalTwin.executions[0].id);
      }
    }
  }, [showLog, selectedExecutionId, digitalTwin]);

  // Update logs when execution changes
  useEffect(() => {
    if (!digitalTwin) return;

    if (currentExecutionId && digitalTwin.executions) {
      // Find the execution
      const execution = digitalTwin.executions.find(
        (exec) => exec.id === currentExecutionId,
      );
      if (execution) {
        setCurrentLogs(execution.jobLogs || []);
        return;
      }
    }

    // Fallback to the default logs
    setCurrentLogs(digitalTwin.jobLogs || []);
  }, [currentExecutionId, digitalTwin]);

  const handleExecutionChange = (event: any) => {
    setCurrentExecutionId(event.target.value);
  };

  return (
    <Dialog open={showLog} maxWidth="md" fullWidth>
      <DialogTitle>{`${formatName(name)} logs`}</DialogTitle>

      {/* Execution selector */}
      {digitalTwin?.executions && digitalTwin.executions.length > 0 && (
        <Box sx={{ mx: 3, my: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="execution-select-label">Execution</InputLabel>
            <Select
              labelId="execution-select-label"
              value={currentExecutionId || ''}
              label="Execution"
              onChange={handleExecutionChange}
            >
              {digitalTwin.executions.map((execution) => (
                <MenuItem key={execution.id} value={execution.id}>
                  {execution.name ||
                    `Execution ${execution.id.substring(0, 8)}`}{' '}
                  ({execution.status})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      <DialogContent dividers>
        {currentLogs.length > 0 ? (
          currentLogs.map(
            (jobLog: { jobName: string; log: string }, index: number) => (
              <div key={index} style={{ marginBottom: '16px' }}>
                <Typography variant="h6">{jobLog.jobName}</Typography>
                <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                  {jobLog.log}
                </Typography>
              </div>
            ),
          )
        ) : (
          <Typography variant="body2">No logs available</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => handleCloseLog(setShowLog)} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default LogDialog;
