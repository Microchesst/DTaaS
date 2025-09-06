// filepath: /workspaces/DTaaS/client/src/preview/store/executionsLoadingState.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from 'store/store';

interface ExecutionsLoadingState {
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
}

const initialState: ExecutionsLoadingState = {
  isLoading: true,
  isLoaded: false,
  error: null,
};

const executionsLoadingSlice = createSlice({
  name: 'executionsLoading',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setLoaded: (state, action: PayloadAction<boolean>) => {
      state.isLoaded = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setLoading, setLoaded, setError } = executionsLoadingSlice.actions;

export const selectExecutionsLoading = (state: RootState) => state.executionsLoading.isLoading;
export const selectExecutionsLoaded = (state: RootState) => state.executionsLoading.isLoaded;
export const selectExecutionsError = (state: RootState) => state.executionsLoading.error;

export default executionsLoadingSlice.reducer;
