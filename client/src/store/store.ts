import { combineReducers } from 'redux';
import { configureStore } from '@reduxjs/toolkit';
import {
  persistExecutionsMiddleware,
  loadExecutionsFromStorage,
} from 'preview/store/persistExecutions';
import { pipelineStatusMiddleware } from 'preview/store/pipelineStatusMiddleware';
import digitalTwinSlice from 'preview/store/digitalTwin.slice';
import snackbarSlice from 'preview/store/snackbar.slice';
import assetsSlice from 'preview/store/assets.slice';
import fileSlice from 'preview/store/file.slice';
import cartSlice from 'preview/store/cart.slice';
import libraryConfigFilesSlice from 'preview/store/libraryConfigFiles.slice';
import menuSlice from './menu.slice';
import authSlice from './auth.slice';

const rootReducer = combineReducers({
  menu: menuSlice,
  auth: authSlice,
  assets: assetsSlice,
  digitalTwin: digitalTwinSlice,
  snackbar: snackbarSlice,
  files: fileSlice,
  cart: cartSlice,
  libraryConfigFiles: libraryConfigFilesSlice,
});

// Load saved executions
// const savedExecutionsData = loadExecutionsFromStorage();

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['digitalTwin/setDigitalTwin'],
      },
    }).concat(persistExecutionsMiddleware, pipelineStatusMiddleware),
});

// Load saved executions from localStorage and add to store
const savedData = loadExecutionsFromStorage();
if (savedData.executions) {
  // Load the executions into the store by dispatching actions
  // This approach avoids type issues with preloadedState
  Object.entries(savedData.executions).forEach(([dtName, dtExecutions]) => {
    if (Array.isArray(dtExecutions)) {
      dtExecutions.forEach((execution: Record<string, unknown>) => {
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

export type RootState = ReturnType<typeof store.getState>;
export { store };
export default store;
