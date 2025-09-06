// filepath: /workspaces/DTaaS/client/src/preview/store/indexedDBService.ts
import { ExecutionInstance } from 'preview/types/ExecutionInstance';
import { JobLog } from 'preview/components/asset/StartStopButton';

const DB_NAME = 'dtaas_db';
const DB_VERSION = 1;
const DT_EXECUTIONS_STORE = 'dt_executions'; // Store for <DT-name, [pipelineID-1, pipelineID-2, etc.]>
const PIPELINE_LOGS_STORE = 'pipeline_logs'; // Store for <pipelineID-x, execution logs>

interface DBData {
  executions: Record<string, ExecutionInstance[]>;
  currentExecutions: Record<string, string | null>;
}

/**
 * Opens the IndexedDB database and creates the necessary object stores
 */
export const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('Error opening IndexedDB:', event);
      reject(new Error('Could not open IndexedDB'));
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store for digital twin executions mapping
      // This store maps DT names to arrays of pipeline IDs
      if (!db.objectStoreNames.contains(DT_EXECUTIONS_STORE)) {
        console.log('Creating DT_EXECUTIONS_STORE');
        db.createObjectStore(DT_EXECUTIONS_STORE, { keyPath: 'id' });
      }

      // Create object store for pipeline logs
      // This store maps pipeline IDs to execution logs
      if (!db.objectStoreNames.contains(PIPELINE_LOGS_STORE)) {
        console.log('Creating PIPELINE_LOGS_STORE');
        db.createObjectStore(PIPELINE_LOGS_STORE, { keyPath: 'id' });
      }
    };
  });
};

/**
 * Saves execution data to IndexedDB
 * For now, we're storing all data in a single record in the DT_EXECUTIONS_STORE
 * In the future, we could split this to better match the specification
 */
export const saveExecutionsToIndexedDB = async (
  data: DBData,
): Promise<void> => {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(
      [DT_EXECUTIONS_STORE, PIPELINE_LOGS_STORE],
      'readwrite',
    );
    const dtStore = transaction.objectStore(DT_EXECUTIONS_STORE);
    const logsStore = transaction.objectStore(PIPELINE_LOGS_STORE);

    // Save the main execution data
    dtStore.put({
      id: 'executions_data',
      ...data,
    });

    // Also save individual execution logs to the pipeline logs store
    // This follows the specification more closely
    Object.entries(data.executions).forEach(([dtName, executions]) => {
      executions.forEach((execution) => {
        if (execution.pipelineId && execution.jobLogs.length > 0) {
          logsStore.put({
            id: `pipeline-${execution.pipelineId}`,
            dtName,
            executionId: execution.id,
            logs: execution.jobLogs,
          });
        }
      });
    });

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };

      transaction.onerror = (event) => {
        console.error('Error saving executions to IndexedDB:', event);
        reject(new Error('Failed to save executions to IndexedDB'));
      };
    });
  } catch (error) {
    console.error('Error in saveExecutionsToIndexedDB:', error);
    throw error;
  }
};

/**
 * Loads execution data from IndexedDB
 */
export const loadExecutionsFromIndexedDB = async (): Promise<DBData> => {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([DT_EXECUTIONS_STORE], 'readonly');
    const store = transaction.objectStore(DT_EXECUTIONS_STORE);
    const request = store.get('executions_data');

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const result = (event.target as IDBRequest).result;
        db.close();

        if (result) {
          // Remove the id field from the result
          const { id, ...data } = result;
          resolve(data as DBData);
        } else {
          // Return empty data if nothing is found
          resolve({
            executions: {},
            currentExecutions: {},
          });
        }
      };

      request.onerror = (event) => {
        console.error('Error loading executions from IndexedDB:', event);
        reject(new Error('Failed to load executions from IndexedDB'));
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Error in loadExecutionsFromIndexedDB:', error);
    // Return empty data on error
    return {
      executions: {},
      currentExecutions: {},
    };
  }
};

/**
 * Gets logs for a specific pipeline ID
 */
export const getLogsForPipeline = async (
  pipelineId: number,
): Promise<JobLog[]> => {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([PIPELINE_LOGS_STORE], 'readonly');
    const store = transaction.objectStore(PIPELINE_LOGS_STORE);
    const request = store.get(`pipeline-${pipelineId}`);

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const result = (event.target as IDBRequest).result;
        db.close();

        if (result && result.logs) {
          resolve(result.logs);
        } else {
          resolve([]);
        }
      };

      request.onerror = (event) => {
        console.error(`Error loading logs for pipeline ${pipelineId}:`, event);
        reject(new Error(`Failed to load logs for pipeline ${pipelineId}`));
      };
    });
  } catch (error) {
    console.error(
      `Error in getLogsForPipeline for pipeline ${pipelineId}:`,
      error,
    );
    return [];
  }
};

/**
 * Clears all execution data from IndexedDB
 */
export const clearExecutionsFromIndexedDB = async (): Promise<void> => {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(
      [DT_EXECUTIONS_STORE, PIPELINE_LOGS_STORE],
      'readwrite',
    );
    const dtStore = transaction.objectStore(DT_EXECUTIONS_STORE);
    const logsStore = transaction.objectStore(PIPELINE_LOGS_STORE);

    // Clear both stores
    dtStore.clear();
    logsStore.clear();

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };

      transaction.onerror = (event) => {
        console.error('Error clearing executions from IndexedDB:', event);
        reject(new Error('Failed to clear executions from IndexedDB'));
      };
    });
  } catch (error) {
    console.error('Error in clearExecutionsFromIndexedDB:', error);
    throw error;
  }
};
