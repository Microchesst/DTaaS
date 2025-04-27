// filepath: /workspaces/DTaaS/client/src/preview/route/digitaltwins/execute/pipelineCancel.ts
import store from 'store/store';
import { showSnackbar } from 'preview/store/snackbar.slice';
import { updateExecutionStatus } from 'preview/store/digitalTwin.slice';
import { formatName } from 'preview/util/digitalTwin';

/**
 * Cancel a running pipeline
 * @param pipelineId The pipeline ID to cancel
 * @param digitalTwinName The name of the digital twin
 * @param executionId The execution ID to update
 */
export const cancelPipeline = async (
  pipelineId: number,
  digitalTwinName: string,
  executionId: string,
): Promise<void> => {
  // Get the digital twin from the store
  const { dispatch } = store;
  const digitalTwin = store.getState().digitalTwin.digitalTwin[digitalTwinName];

  if (!digitalTwin || !digitalTwin.gitlabInstance.projectId) {
    dispatch(
      showSnackbar({
        message: `Could not find digital twin or project ID for ${formatName(digitalTwinName)}`,
        severity: 'error',
      }),
    );
    return;
  }

  try {
    // Cancel the pipeline
    await digitalTwin.gitlabInstance.api.Pipelines.cancel(
      digitalTwin.gitlabInstance.projectId,
      pipelineId,
    );

    // Try to cancel child pipeline if it exists
    try {
      await digitalTwin.gitlabInstance.api.Pipelines.cancel(
        digitalTwin.gitlabInstance.projectId,
        pipelineId + 1,
      );
    } catch (_error) {
      // Child pipeline might not exist yet, ignore error
    }

    // Update execution status
    dispatch(
      updateExecutionStatus({
        assetName: digitalTwinName,
        executionId,
        status: 'canceled',
      }),
    );

    dispatch(
      showSnackbar({
        message: `Execution canceled for ${formatName(digitalTwinName)}`,
        severity: 'success',
      }),
    );
  } catch (_error) {
    // Error canceling pipeline
    dispatch(
      showSnackbar({
        message: `Failed to cancel execution for ${formatName(digitalTwinName)}`,
        severity: 'error',
      }),
    );
  }
};
