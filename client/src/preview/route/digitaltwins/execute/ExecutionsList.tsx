import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Tooltip,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { RootState } from '../../../../store/store';
import {
  setCurrentExecution,
  removeExecution,
} from '../../../store/digitalTwin.slice';
import {
  selectExecutionsLoading,
  selectExecutionsError,
} from '../../../store/executionsLoadingState';
import { cancelPipeline } from './pipelineCancel';
import { handleStart } from './pipelineHandler';

const ExecutionsList: React.FC<{
  digitalTwinId: string;
  onShowLogs: (executionId: string) => void;
}> = ({ digitalTwinId, onShowLogs }) => {
  const dispatch = useDispatch();
  const digitalTwin = useSelector(
    (state: RootState) => state.digitalTwin.digitalTwin[digitalTwinId],
  );
  const isLoading = useSelector(selectExecutionsLoading);
  const loadingError = useSelector(selectExecutionsError);
  const [refreshing, setRefreshing] = useState(false);
  const [, forceUpdate] = useState({});

  // Function to check running executions and trigger status updates
  const checkRunningExecutions = useCallback(() => {
    if (digitalTwin?.executions) {
      const runningExecutions = digitalTwin.executions.filter(
        (exec) => exec.status === 'running' && exec.pipelineId,
      );

      // Trigger pipeline status check for running executions
      runningExecutions.forEach((exec) => {
        if (exec.pipelineId) {
          dispatch({
            type: 'digitalTwin/checkPipelineStatus',
            payload: {
              digitalTwinName: digitalTwinId,
              executionId: exec.id,
              pipelineId: exec.pipelineId,
            },
          });
        }
      });
    }
  }, [digitalTwin, digitalTwinId, dispatch]);

  // Auto-refresh executions list
  useEffect(() => {
    // Initial check
    checkRunningExecutions();

    // Set up periodic refresh
    const refreshTimer = setInterval(() => {
      // Force refresh to update relative timestamps
      forceUpdate({});

      // Check for any running execution status updates
      checkRunningExecutions();
    }, 5000);

    return () => clearInterval(refreshTimer);
  }, [checkRunningExecutions]);

  // Show loading indicator while executions are being loaded
  if (isLoading) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <CircularProgress size={24} sx={{ mb: 1 }} />
        <Typography variant="body2" color="text.secondary">
          Loading executions...
        </Typography>
      </Box>
    );
  }

  // Function for checking all running executions and refreshing the UI
  const handleRefresh = () => {
    setRefreshing(true);

    // Check all running executions
    dispatch({ type: 'digitalTwin/checkAllRunningExecutions' });

    // Add a small delay before ending the refresh state to provide visual feedback
    setTimeout(() => {
      forceUpdate({});
      setRefreshing(false);
    }, 800); // Slightly longer delay for better visual feedback
  };

  // Show error message if there was an error loading executions
  if (loadingError) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="error" sx={{ mb: 1 }}>
          {loadingError}
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
        >
          Retry
        </Button>
      </Box>
    );
  }

  // Show "No executions found" if there are no executions
  if (
    !digitalTwin ||
    !digitalTwin.executions ||
    digitalTwin.executions.length === 0
  ) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No executions found
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<PlayArrowIcon />}
          sx={{ mt: 1 }}
          onClick={() => digitalTwin && handleStart(digitalTwin, dispatch)}
        >
          Start New Execution
        </Button>
      </Box>
    );
  }

  const handleSetCurrentExecution = (executionId: string) => {
    dispatch(
      setCurrentExecution({
        assetName: digitalTwinId,
        executionId,
      }),
    );
  };

  const handleCancelExecution = async (executionId: string) => {
    const execution = digitalTwin.executions.find(
      (exec) => exec.id === executionId,
    );

    if (execution && execution.pipelineId) {
      setRefreshing(true);
      await cancelPipeline(execution.pipelineId, digitalTwinId, executionId);

      // Check status again to reflect changes
      dispatch({
        type: 'digitalTwin/checkPipelineStatus',
        payload: {
          digitalTwinName: digitalTwinId,
          executionId,
          pipelineId: execution.pipelineId,
        },
      });

      // Force update UI after cancellation
      setTimeout(() => {
        forceUpdate({});
        setRefreshing(false);
      }, 1000);
    }
  };

  const handleRemoveExecution = (executionId: string) => {
    dispatch(
      removeExecution({
        assetName: digitalTwinId,
        executionId,
      }),
    );
    // Force update after removal
    forceUpdate({});
  };

  type ChipColor =
    | 'default'
    | 'primary'
    | 'secondary'
    | 'error'
    | 'info'
    | 'success'
    | 'warning';

  const getStatusColor = (status: string): ChipColor => {
    switch (status) {
      case 'running':
        return 'primary';
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'canceled':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ mt: 2, mb: 2 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1,
        }}
      >
        <Typography variant="subtitle2">Executions</Typography>
        <Box>
          <Tooltip title="Refresh executions list">
            <span>
              <IconButton
                size="small"
                onClick={handleRefresh}
                disabled={refreshing}
                sx={{ mr: 1 }}
              >
                {refreshing ? (
                  <CircularProgress size={18} />
                ) : (
                  <RefreshIcon fontSize="small" />
                )}
              </IconButton>
            </span>
          </Tooltip>
          <Button
            variant="outlined"
            size="small"
            startIcon={<PlayArrowIcon />}
            onClick={() => digitalTwin && handleStart(digitalTwin, dispatch)}
          >
            New
          </Button>
        </Box>
      </Box>
      <List dense>
        {digitalTwin.executions
          .slice()
          .sort((a, b) => {
            // First, sort by status (running first)
            if (a.status === 'running' && b.status !== 'running') return -1;
            if (a.status !== 'running' && b.status === 'running') return 1;

            // Then by start time (newest first)
            return b.startTime - a.startTime;
          })
          .map((execution) => {
            const isActive = execution.id === digitalTwin.currentExecutionId;
            return (
              <ListItem
                key={execution.id}
                sx={{
                  border: '1px solid',
                  borderColor: isActive ? 'primary.main' : 'divider',
                  borderRadius: 1,
                  mb: 1,
                  bgcolor: isActive ? 'action.selected' : 'background.paper',
                }}
              >
                <ListItemText
                  primary={
                    <>
                      <Typography
                        component="span"
                        variant="body2"
                        sx={{ fontWeight: isActive ? 'bold' : 'normal' }}
                      >
                        {execution.name ||
                          `Execution ${execution.id.substring(0, 8)}`}
                      </Typography>
                      {execution.pipelineId && (
                        <Tooltip title="Pipeline ID">
                          <Chip
                            size="small"
                            label={`#${execution.pipelineId}`}
                            color="info"
                            variant="outlined"
                            sx={{ ml: 1, fontSize: '0.7rem' }}
                          />
                        </Tooltip>
                      )}
                      {isActive && (
                        <Chip
                          size="small"
                          label="Current"
                          color="primary"
                          variant="outlined"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </>
                  }
                  secondary={
                    <>
                      <Chip
                        size="small"
                        color={getStatusColor(execution.status)}
                        label={execution.status}
                        sx={{ mr: 1, fontWeight: 'bold' }}
                        variant={
                          execution.status === 'running' ? 'outlined' : 'filled'
                        }
                      />
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                      >
                        Started {new Date(execution.startTime).toLocaleString()}
                        {execution.status !== 'running' && (
                          <>
                            {' • '}
                            {execution.status === 'completed' && 'Completed'}
                            {execution.status === 'failed' && 'Failed'}
                            {execution.status === 'canceled' && 'Canceled'}
                            {' recently'}
                          </>
                        )}
                      </Typography>
                    </>
                  }
                />
                <ListItemSecondaryAction>
                  {execution.status === 'running' ? (
                    <Tooltip title="Cancel execution">
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => handleCancelExecution(execution.id)}
                      >
                        <StopIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Tooltip title="Remove execution">
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => handleRemoveExecution(execution.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="View logs">
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => onShowLogs(execution.id)}
                      sx={{ ml: 1 }}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {!isActive && (
                    <Tooltip title="Set as current execution">
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => handleSetCurrentExecution(execution.id)}
                        sx={{ ml: 1 }}
                      >
                        <PlayArrowIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
            );
          })}
      </List>
    </Box>
  );
};

export default ExecutionsList;
