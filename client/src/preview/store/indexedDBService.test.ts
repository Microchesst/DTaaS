// filepath: /workspaces/DTaaS/client/src/preview/store/indexedDBService.test.ts
import {
  openDatabase,
  saveExecutionsToIndexedDB,
  loadExecutionsFromIndexedDB,
  clearExecutionsFromIndexedDB,
} from './indexedDBService';
import { ExecutionInstance } from 'preview/types/ExecutionInstance';

// Mock IndexedDB
const indexedDB = {
  open: jest.fn(),
};

// Mock IDBRequest
const mockRequest = {
  onerror: null as any,
  onsuccess: null as any,
  onupgradeneeded: null as any,
  result: {
    createObjectStore: jest.fn(),
    objectStoreNames: {
      contains: jest.fn().mockReturnValue(false),
    },
    transaction: jest.fn(),
    close: jest.fn(),
  },
};

// Mock IDBTransaction
const mockTransaction = {
  oncomplete: null as any,
  onerror: null as any,
  objectStore: jest.fn(),
};

// Mock IDBObjectStore
const mockObjectStore = {
  put: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
};

describe('IndexedDB Service', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock implementation
    (global as any).indexedDB = indexedDB;
    indexedDB.open.mockReturnValue(mockRequest);
    mockTransaction.objectStore.mockReturnValue(mockObjectStore);
    mockRequest.result.transaction.mockReturnValue(mockTransaction);
    mockObjectStore.get.mockImplementation(() => {
      const request = {
        onsuccess: null as any,
        onerror: null as any,
        result: {
          id: 'executions_data',
          executions: {
            'test-dt': [
              {
                id: 'test-execution',
                pipelineId: 123,
                startTime: Date.now(),
                jobLogs: [],
                status: 'completed',
                name: 'Test Execution',
              } as ExecutionInstance,
            ],
          },
          currentExecutions: {
            'test-dt': 'test-execution',
          },
        },
      };
      return request;
    });
  });

  test('openDatabase should return a promise that resolves with the database', async () => {
    const openPromise = openDatabase();
    
    // Simulate successful database open
    setTimeout(() => {
      mockRequest.onsuccess({ target: mockRequest } as any);
    }, 0);
    
    const db = await openPromise;
    expect(db).toBe(mockRequest.result);
    expect(indexedDB.open).toHaveBeenCalled();
  });

  test('saveExecutionsToIndexedDB should save data to the database', async () => {
    const testData = {
      executions: {
        'test-dt': [
          {
            id: 'test-execution',
            pipelineId: 123,
            startTime: Date.now(),
            jobLogs: [],
            status: 'completed',
            name: 'Test Execution',
          } as ExecutionInstance,
        ],
      },
      currentExecutions: {
        'test-dt': 'test-execution',
      },
    };

    const savePromise = saveExecutionsToIndexedDB(testData);
    
    // Simulate successful transaction
    setTimeout(() => {
      mockRequest.onsuccess({ target: mockRequest } as any);
      mockTransaction.oncomplete();
    }, 0);
    
    await savePromise;
    expect(mockObjectStore.put).toHaveBeenCalledWith({
      id: 'executions_data',
      ...testData,
    });
  });

  test('loadExecutionsFromIndexedDB should load data from the database', async () => {
    const loadPromise = loadExecutionsFromIndexedDB();
    
    // Simulate successful database open and data retrieval
    setTimeout(() => {
      mockRequest.onsuccess({ target: mockRequest } as any);
      const getRequest = mockObjectStore.get.mock.results[0].value;
      getRequest.onsuccess({ target: getRequest } as any);
    }, 0);
    
    const data = await loadPromise;
    expect(data).toEqual({
      executions: {
        'test-dt': [
          {
            id: 'test-execution',
            pipelineId: 123,
            startTime: expect.any(Number),
            jobLogs: [],
            status: 'completed',
            name: 'Test Execution',
          },
        ],
      },
      currentExecutions: {
        'test-dt': 'test-execution',
      },
    });
  });

  test('clearExecutionsFromIndexedDB should delete data from the database', async () => {
    const clearPromise = clearExecutionsFromIndexedDB();
    
    // Simulate successful database open and transaction
    setTimeout(() => {
      mockRequest.onsuccess({ target: mockRequest } as any);
      mockTransaction.oncomplete();
    }, 0);
    
    await clearPromise;
    expect(mockObjectStore.delete).toHaveBeenCalledWith('executions_data');
  });
});
