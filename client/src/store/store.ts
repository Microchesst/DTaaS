import { combineReducers } from 'redux';
import { configureStore } from '@reduxjs/toolkit';
import {
  persistExecutionsMiddleware,
  loadExecutionsFromStorage,
} from 'preview/store/persistExecutionsIndexedDB';
import { pipelineStatusMiddleware } from 'preview/store/pipelineStatusMiddleware';
import digitalTwinSlice from 'preview/store/digitalTwin.slice';
import snackbarSlice from 'preview/store/snackbar.slice';
import assetsSlice from 'preview/store/assets.slice';
import fileSlice from 'preview/store/file.slice';
import cartSlice from 'preview/store/cart.slice';
import libraryConfigFilesSlice from 'preview/store/libraryConfigFiles.slice';
import executionsLoadingReducer, {
  setLoading,
  setLoaded,
  setError,
} from 'preview/store/executionsLoadingState';
import menuSlice from './menu.slice';
import authSlice from './auth.slice';
import { ExecutionInstance } from 'preview/types/ExecutionInstance';

const rootReducer = combineReducers({
  menu: menuSlice,
  auth: authSlice,
  assets: assetsSlice,
  digitalTwin: digitalTwinSlice,
  snackbar: snackbarSlice,
  files: fileSlice,
  cart: cartSlice,
  libraryConfigFiles: libraryConfigFilesSlice,
  executionsLoading: executionsLoadingReducer,
});

// Create the Redux store
const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['digitalTwin/setDigitalTwin'],
      },
    }).concat(persistExecutionsMiddleware, pipelineStatusMiddleware),
});

// Load saved executions from IndexedDB and add to store
// This is done asynchronously after the store is created
(async () => {
  // Set loading state
  store.dispatch(setLoading(true));
  store.dispatch(setLoaded(false));
  store.dispatch(setError(null));

  try {
    const savedData = await loadExecutionsFromStorage();

    if (savedData.executions) {
      // Load the executions into the store by dispatching actions
      Object.entries(savedData.executions).forEach(([dtName, dtExecutions]) => {
        if (Array.isArray(dtExecutions)) {
          // Cast the array to ExecutionInstance[] to satisfy TypeScript
          (dtExecutions as ExecutionInstance[]).forEach((execution) => {
            store.dispatch({
              type: 'digitalTwin/addExecution',
              payload: {
                assetName: dtName,
                execution,
              },
            });
          });
        }
      });

      // Set current execution IDs
      if (savedData.currentExecutions) {
        Object.entries(savedData.currentExecutions).forEach(
          ([dtName, executionId]) => {
            if (executionId) {
              store.dispatch({
                type: 'digitalTwin/setCurrentExecution',
                payload: {
                  assetName: dtName,
                  executionId,
                },
              });
            }
          },
        );
      }
    }

    // Set loading state to complete
    store.dispatch(setLoading(false));
    store.dispatch(setLoaded(true));
  } catch (error) {
    console.error('Failed to load executions from IndexedDB:', error);
    store.dispatch(setLoading(false));
    store.dispatch(setError('Failed to load executions from IndexedDB'));
  }
})();

export type RootState = ReturnType<typeof store.getState>;
export { store };
export default store;
