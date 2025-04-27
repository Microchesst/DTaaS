// filepath: /workspaces/DTaaS/client/src/preview/store/persistExecutions.ts
import { Middleware } from 'redux';
import { RootState } from 'store/store';
import { ExecutionInstance } from 'preview/types/ExecutionInstance';

const STORAGE_KEY = 'dtaas_executions';

export const persistExecutionsMiddleware: Middleware =
  (store) => (next) => (action) => {
    const result = next(action);

    // If action modified executions, save to localStorage
    if (
      typeof action === 'object' &&
      action !== null &&
      'type' in action &&
      typeof action.type === 'string' &&
      action.type.startsWith('digitalTwin/') &&
      (action.type.includes('Execution') ||
        action.type === 'digitalTwin/setDigitalTwin')
    ) {
      const state = store.getState() as RootState;
      const executions: Record<string, ExecutionInstance[]> = {};
      const currentExecutions: Record<string, string | null> = {};

      // Get executions from each DT
      Object.entries(state.digitalTwin.digitalTwin).forEach(([dtName, dt]) => {
        if (dt.executions?.length > 0) {
          executions[dtName] = dt.executions;
          currentExecutions[dtName] = dt.currentExecutionId;
        }
      });

      // Save to localStorage
      if (Object.keys(executions).length > 0) {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            executions,
            currentExecutions,
          }),
        );
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    return result;
  };

// Load saved executions from localStorage
export const loadExecutionsFromStorage = () => {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (!savedData) return {};

    const parsedData = JSON.parse(savedData);
    return {
      executions: parsedData.executions || {},
      currentExecutions: parsedData.currentExecutions || {},
    };
  } catch (_e) {
    // Failed to parse stored executions
    localStorage.removeItem(STORAGE_KEY);
    return {};
  }
};
