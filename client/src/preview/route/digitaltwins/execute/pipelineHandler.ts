import DigitalTwin, { formatName } from 'preview/util/digitalTwin';
import { ExecutionInstance } from 'preview/types/ExecutionInstance';
import { useDispatch } from 'react-redux';
import { showSnackbar } from 'preview/store/snackbar.slice';
import {
  addExecution,
  updateExecutionStatus,
} from 'preview/store/digitalTwin.slice';
import { updatePipelineState } from './pipelineUtils';

/**
 * Handle button click based on the current button state (Start/Stop)
 */
export const handleButtonClick = async (
  buttonText: string,
  setButtonText: React.Dispatch<React.SetStateAction<string>>,
  digitalTwin: DigitalTwin,
  setLogButtonDisabled: React.Dispatch<React.SetStateAction<boolean>>,
  dispatch: ReturnType<typeof useDispatch>,
) => {
  if (buttonText === 'Start') {
    // Start a new execution
    await handleStart(digitalTwin, dispatch);
    setButtonText('Stop');
    setLogButtonDisabled(true);
  } else {
    // Stop the current execution
    await handleStop(digitalTwin, digitalTwin.currentExecutionId, dispatch);
    setButtonText('Start');
    setLogButtonDisabled(false);
  }
};

/**
 * Start a new execution for a Digital Twin
 */
export const handleStart = async (
  digitalTwin: DigitalTwin,
  dispatch: ReturnType<typeof useDispatch>,
) => {
  // Create a unique ID for this execution
  const executionId = `exec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const executionName = new Date().toLocaleString();

  // Create new execution instance
  const newExecution: ExecutionInstance = {
    id: executionId,
    pipelineId: null, // Will be set after pipeline is started
    startTime: Date.now(),
    jobLogs: [],
    status: 'running',
    name: executionName,
  };

  // Add the execution to the store
  dispatch(
    addExecution({
      assetName: digitalTwin.DTName,
      execution: newExecution,
    }),
  );

  updatePipelineState(digitalTwin, dispatch);

  // Start the pipeline and get pipeline ID
  const pipelineId = await digitalTwin.execute();

  if (pipelineId) {
    // Update the existing execution with the pipeline ID
    dispatch(
      updateExecutionStatus({
        assetName: digitalTwin.DTName,
        executionId,
        status: 'running',
        pipelineId,
      }),
    );

    // Show a success message with execution information
    dispatch(
      showSnackbar({
        message: `Started new execution for ${formatName(digitalTwin.DTName)} (ID: ${executionId.substring(0, 8)})`,
        severity: 'success',
      }),
    );

    // Start monitoring the pipeline
    dispatch({
      type: 'digitalTwin/checkPipelineStatus',
      payload: {
        digitalTwinName: digitalTwin.DTName,
        executionId,
        pipelineId,
      },
    });
  } else {
    // Pipeline failed to start
    dispatch(
      updateExecutionStatus({
        assetName: digitalTwin.DTName,
        executionId,
        status: 'failed',
      }),
    );

    dispatch(
      showSnackbar({
        message: `Failed to start execution for ${formatName(digitalTwin.DTName)}`,
        severity: 'error',
      }),
    );
  }
};

/**
 * Stop a specific execution
 */
export const handleStop = async (
  digitalTwin: DigitalTwin,
  executionId: string | null,
  dispatch: ReturnType<typeof useDispatch>,
) => {
  // Find the execution to stop
  const execution = executionId
    ? digitalTwin.executions.find((e) => e.id === executionId)
    : null;

  try {
    if (execution && execution.pipelineId) {
      await stopPipeline(digitalTwin, execution.pipelineId);
    } else if (digitalTwin.pipelineId) {
      await stopPipeline(digitalTwin, digitalTwin.pipelineId);
    }

    dispatch(
      showSnackbar({
        message: `Execution stopped successfully for ${formatName(
          digitalTwin.DTName,
        )}`,
        severity: 'success',
      }),
    );
  } catch (_error) {
    dispatch(
      showSnackbar({
        message: `Execution stop failed for ${formatName(digitalTwin.DTName)}`,
        severity: 'error',
      }),
    );
  } finally {
    // Update execution status
    if (executionId) {
      dispatch(
        updateExecutionStatus({
          assetName: digitalTwin.DTName,
          executionId,
          status: 'canceled',
        }),
      );
    }
  }
};

/**
 * Stop a pipeline by its ID
 */
export const stopPipeline = async (
  digitalTwin: DigitalTwin,
  pipelineId: number,
) => {
  if (digitalTwin.gitlabInstance.projectId) {
    // Stop parent pipeline
    await digitalTwin.gitlabInstance.api.Pipelines.cancel(
      digitalTwin.gitlabInstance.projectId,
      pipelineId,
    );

    // Try to stop child pipeline if it exists
    try {
      await digitalTwin.gitlabInstance.api.Pipelines.cancel(
        digitalTwin.gitlabInstance.projectId,
        pipelineId + 1,
      );
    } catch (_error) {
      // Child pipeline might not exist yet, ignore error
    }
  }
};
