// filepath: /workspaces/DTaaS/client/src/preview/store/persistExecutionsIndexedDB.ts
import { Middleware } from 'redux';
import { RootState } from 'store/store';
import { ExecutionInstance } from 'preview/types/ExecutionInstance';
import {
  saveExecutionsToIndexedDB,
  loadExecutionsFromIndexedDB,
} from './indexedDBService';

/**
 * Redux middleware that persists execution data to IndexedDB
 * whenever relevant actions are dispatched
 */
export const persistExecutionsMiddleware: Middleware =
  (store) => (next) => (action) => {
    const result = next(action);

    // If action modified executions, save to IndexedDB
    if (
      typeof action === 'object' &&
      action !== null &&
      'type' in action &&
      typeof action.type === 'string' &&
      action.type.startsWith('digitalTwin/') &&
      (action.type.includes('Execution') ||
        action.type === 'digitalTwin/setDigitalTwin')
    ) {
      try {
        const state = store.getState() as RootState;
        const executions: Record<string, ExecutionInstance[]> = {};
        const currentExecutions: Record<string, string | null> = {};

        // Get executions from each DT
        Object.entries(state.digitalTwin.digitalTwin).forEach(
          ([dtName, dt]) => {
            if (dt.executions?.length > 0) {
              executions[dtName] = dt.executions;
              currentExecutions[dtName] = dt.currentExecutionId;
            }
          },
        );

        // Save to IndexedDB
        if (Object.keys(executions).length > 0) {
          saveExecutionsToIndexedDB({
            executions,
            currentExecutions,
          }).catch((error) => {
            console.error('Failed to save executions to IndexedDB:', error);
          });
        }
      } catch (error) {
        // Ensure any errors in the middleware don't break the application
        console.error('Error in persistExecutionsMiddleware:', error);
      }
    }

    return result;
  };

/**
 * Load saved executions from IndexedDB
 * Returns a promise that resolves to the saved data
 */
export const loadExecutionsFromStorage = async () => {
  try {
    const data = await loadExecutionsFromIndexedDB();
    return data;
  } catch (error) {
    console.error('Failed to load executions from IndexedDB:', error);
    return {
      executions: {},
      currentExecutions: {},
    };
  }
};
