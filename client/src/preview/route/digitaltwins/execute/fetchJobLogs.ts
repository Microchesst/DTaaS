// filepath: /workspaces/DTaaS/client/src/preview/route/digitaltwins/execute/fetchJobLogs.ts
import DigitalTwin from 'preview/util/digitalTwin';
import cleanLog from 'model/backend/gitlab/cleanLog';

/**
 * Fetch job logs for a specific pipeline
 * @param digitalTwin The digital twin instance
 * @param pipelineId The pipeline ID
 * @returns Array of job logs
 */
export const fetchJobLogs = async (
  digitalTwin: DigitalTwin,
  pipelineId: number,
): Promise<Array<{ jobName: string; log: string }>> => {
  const { gitlabInstance } = digitalTwin;
  const { projectId } = gitlabInstance;

  if (!projectId) {
    return [];
  }

  try {
    const jobs = await gitlabInstance.getPipelineJobs(projectId, pipelineId);

    const logPromises = jobs.map(async (job: any) => {
      if (!job || typeof job.id === 'undefined') {
        return { jobName: 'Unknown', log: 'Job ID not available' };
      }

      try {
        let log = await gitlabInstance.getJobTrace(projectId, job.id);

        if (typeof log === 'string') {
          log = cleanLog(log);
        } else {
          log = '';
        }

        return {
          jobName: typeof job.name === 'string' ? job.name : 'Unknown',
          log,
        };
      } catch (_e) {
        return {
          jobName: typeof job.name === 'string' ? job.name : 'Unknown',
          log: 'Error fetching log content',
        };
      }
    });

    return (await Promise.all(logPromises)).reverse();
  } catch (_e) {
    // Error fetching job logs
    return [];
  }
};
