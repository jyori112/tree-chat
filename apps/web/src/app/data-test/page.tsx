'use client';

import { useState } from 'react';
import { useAuth, useOrganization } from '@clerk/nextjs';

interface TestResult {
  operation: string;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
  duration?: number;
}

export default function DataInfrastructureTestPage() {
  const { userId } = useAuth();
  const { organization } = useOrganization();
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Test data
  const [testPath, setTestPath] = useState('/test/session-123/metadata');
  const [testValue, setTestValue] = useState('{"title": "Test Session", "createdAt": "2024-01-01T00:00:00Z"}');
  const [testTreePrefix, setTestTreePrefix] = useState('/test/session-123');
  const [testDefaultValue, setTestDefaultValue] = useState('{"default": "fallback value"}');

  const addResult = (result: TestResult) => {
    setResults(prev => [result, ...prev].slice(0, 10)); // Keep only last 10 results
  };

  const executeApiCall = async (endpoint: string, body: any): Promise<any> => {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`/api/data-test/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspaceId: organization?.id || 'test-workspace',
          userId: userId || 'test-user',
          ...body,
        }),
      });

      const data = await response.json();
      const duration = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return { data, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      throw { error: error instanceof Error ? error.message : 'Unknown error', duration };
    }
  };

  const testWrite = async () => {
    setLoading(true);
    try {
      let parsedValue;
      try {
        parsedValue = JSON.parse(testValue);
      } catch {
        parsedValue = testValue; // Use as string if not valid JSON
      }

      const { data, duration } = await executeApiCall('write', {
        path: testPath,
        value: parsedValue,
      });

      addResult({
        operation: 'WRITE',
        success: true,
        data,
        timestamp: new Date().toISOString(),
        duration,
      });
    } catch (err: any) {
      addResult({
        operation: 'WRITE',
        success: false,
        error: err.error || err.message,
        timestamp: new Date().toISOString(),
        duration: err.duration,
      });
    } finally {
      setLoading(false);
    }
  };

  const testRead = async () => {
    setLoading(true);
    try {
      const { data, duration } = await executeApiCall('read', {
        path: testPath,
      });

      addResult({
        operation: 'READ',
        success: true,
        data,
        timestamp: new Date().toISOString(),
        duration,
      });
    } catch (err: any) {
      addResult({
        operation: 'READ',
        success: false,
        error: err.error || err.message,
        timestamp: new Date().toISOString(),
        duration: err.duration,
      });
    } finally {
      setLoading(false);
    }
  };

  const testReadTree = async () => {
    setLoading(true);
    try {
      const { data, duration } = await executeApiCall('readTree', {
        pathPrefix: testTreePrefix,
      });

      addResult({
        operation: 'READ_TREE',
        success: true,
        data,
        timestamp: new Date().toISOString(),
        duration,
      });
    } catch (err: any) {
      addResult({
        operation: 'READ_TREE',
        success: false,
        error: err.error || err.message,
        timestamp: new Date().toISOString(),
        duration: err.duration,
      });
    } finally {
      setLoading(false);
    }
  };

  const testReadWithDefault = async () => {
    setLoading(true);
    try {
      let parsedDefault;
      try {
        parsedDefault = JSON.parse(testDefaultValue);
      } catch {
        parsedDefault = testDefaultValue;
      }

      const { data, duration } = await executeApiCall('readWithDefault', {
        path: '/test/nonexistent/path',
        defaultValue: parsedDefault,
      });

      addResult({
        operation: 'READ_WITH_DEFAULT',
        success: true,
        data,
        timestamp: new Date().toISOString(),
        duration,
      });
    } catch (err: any) {
      addResult({
        operation: 'READ_WITH_DEFAULT',
        success: false,
        error: err.error || err.message,
        timestamp: new Date().toISOString(),
        duration: err.duration,
      });
    } finally {
      setLoading(false);
    }
  };

  const testBatch = async () => {
    setLoading(true);
    try {
      const operations = [
        {
          type: 'write' as const,
          path: '/test/batch-1/data',
          value: { message: 'Batch write 1' },
        },
        {
          type: 'write' as const,
          path: '/test/batch-2/data',
          value: { message: 'Batch write 2' },
        },
        {
          type: 'read' as const,
          path: '/test/batch-1/data',
        },
        {
          type: 'read' as const,
          path: '/test/batch-2/data',
        },
      ];

      const { data, duration } = await executeApiCall('batch', {
        operations,
      });

      addResult({
        operation: 'BATCH',
        success: true,
        data,
        timestamp: new Date().toISOString(),
        duration,
      });
    } catch (err: any) {
      addResult({
        operation: 'BATCH',
        success: false,
        error: err.error || err.message,
        timestamp: new Date().toISOString(),
        duration: err.duration,
      });
    } finally {
      setLoading(false);
    }
  };

  const runAllTests = async () => {
    setResults([]);
    await testWrite();
    await new Promise(resolve => setTimeout(resolve, 100));
    await testRead();
    await new Promise(resolve => setTimeout(resolve, 100));
    await testReadTree();
    await new Promise(resolve => setTimeout(resolve, 100));
    await testReadWithDefault();
    await new Promise(resolve => setTimeout(resolve, 100));
    await testBatch();
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4" data-testid="page-title">
          Data Infrastructure Test Page
        </h1>
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Workspace:</strong> {organization?.name || 'No organization'} ({organization?.id || 'test-workspace'})
            <br />
            <strong>User:</strong> {userId || 'test-user'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Test Controls */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md border">
            <h2 className="text-xl font-semibold mb-4">Test Configuration</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Test Path</label>
                <input
                  type="text"
                  value={testPath}
                  onChange={(e) => setTestPath(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  data-testid="test-path-input"
                  placeholder="/test/session-123/metadata"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Test Value (JSON)</label>
                <textarea
                  value={testValue}
                  onChange={(e) => setTestValue(e.target.value)}
                  className="w-full p-2 border rounded-md h-20"
                  data-testid="test-value-input"
                  placeholder='{"title": "Test Session"}'
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tree Prefix</label>
                <input
                  type="text"
                  value={testTreePrefix}
                  onChange={(e) => setTestTreePrefix(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  data-testid="test-tree-prefix-input"
                  placeholder="/test/session-123"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Default Value (JSON)</label>
                <textarea
                  value={testDefaultValue}
                  onChange={(e) => setTestDefaultValue(e.target.value)}
                  className="w-full p-2 border rounded-md h-20"
                  data-testid="test-default-value-input"
                  placeholder='{"default": "fallback value"}'
                />
              </div>
            </div>
          </div>

          {/* Test Buttons */}
          <div className="bg-white p-6 rounded-lg shadow-md border">
            <h2 className="text-xl font-semibold mb-4">Operations</h2>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={testWrite}
                disabled={loading}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-md"
                data-testid="test-write-button"
              >
                Test Write
              </button>

              <button
                onClick={testRead}
                disabled={loading}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-md"
                data-testid="test-read-button"
              >
                Test Read
              </button>

              <button
                onClick={testReadTree}
                disabled={loading}
                className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-md"
                data-testid="test-tree-button"
              >
                Test Tree
              </button>

              <button
                onClick={testReadWithDefault}
                disabled={loading}
                className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-md"
                data-testid="test-default-button"
              >
                Test Default
              </button>

              <button
                onClick={testBatch}
                disabled={loading}
                className="bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-md"
                data-testid="test-batch-button"
              >
                Test Batch
              </button>

              <button
                onClick={runAllTests}
                disabled={loading}
                className="bg-gray-800 hover:bg-gray-900 disabled:bg-gray-300 text-white px-4 py-2 rounded-md"
                data-testid="run-all-tests-button"
              >
                Run All Tests
              </button>
            </div>

            {loading && (
              <div className="mt-4 text-center">
                <div className="inline-flex items-center" data-testid="loading-indicator">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                  Running test...
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          
          {results.length === 0 && (
            <p className="text-gray-500 text-center py-8" data-testid="no-results">
              No test results yet. Run a test to see results here.
            </p>
          )}

          <div className="space-y-3" data-testid="results-container">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-l-4 ${
                  result.success 
                    ? 'bg-green-50 border-green-400' 
                    : 'bg-red-50 border-red-400'
                }`}
                data-testid={`result-${result.operation.toLowerCase()}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      result.success 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {result.operation}
                    </span>
                    {result.duration && (
                      <span className="ml-2 text-xs text-gray-500">
                        {result.duration}ms
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                {result.error && (
                  <div className="text-red-600 text-sm mb-2" data-testid="error-message">
                    <strong>Error:</strong> {result.error}
                  </div>
                )}

                {result.data && (
                  <div className="text-sm">
                    <strong>Result:</strong>
                    <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto text-xs" data-testid="result-data">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}