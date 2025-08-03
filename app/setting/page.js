'use client';

import { useState, useEffect } from 'react';

// Key for localStorage
const STORAGE_KEY = 'ollamaSettings';

export default function Settings() {
  const [useLocalModels, setUseLocalModels] = useState(false);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Load saved settings
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY);
      if (savedSettings) {
        const { 
          useLocalModels: savedUseLocal = false, 
          selectedModel: savedModel = '' 
        } = JSON.parse(savedSettings);
        
        setUseLocalModels(savedUseLocal);
        if (savedModel) setSelectedModel(savedModel);
      }
      setIsInitialized(true);
    } catch (error) {
      console.error('Error loading settings:', error);
      setError('Failed to load settings');
    }
  }, []);

  // Fetch available models when local models are enabled
  useEffect(() => {
    if (useLocalModels) {
      fetchModels();
    }
  }, [useLocalModels]);

  const fetchModels = async (retryCount = 0) => {
    setIsLoading(true);
    setError('');
    
    try {
      console.log('Attempting to fetch models from Ollama...');
      const apiUrl = 'http://localhost:11434/api/tags';
      console.log('API URL:', apiUrl);
      
      // First, test if Ollama is reachable
      try {
        const pingResponse = await fetch('http://localhost:11434', { method: 'HEAD' });
        console.log('Ollama ping status:', pingResponse.status);
      } catch (pingError) {
        console.error('Ollama ping failed:', pingError);
        throw new Error('Cannot connect to Ollama. Is it running?');
      }
      
      // Then fetch models
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error details');
        console.error('API Error:', { 
          status: response.status, 
          statusText: response.statusText,
          errorText 
        });
        throw new Error(`Failed to fetch models (${response.status})`);
      }
      
      const data = await response.json().catch(async (parseError) => {
        console.error('Failed to parse JSON response:', parseError);
        const textResponse = await response.text();
        console.error('Raw response:', textResponse);
        throw new Error('Invalid response format from Ollama');
      });
      
      console.log('Received models data:', data);
      
      if (!data.models || !Array.isArray(data.models)) {
        console.error('Unexpected response format - missing models array:', data);
        throw new Error('Invalid response format: missing models array');
      }
      
      const availableModels = data.models || [];
      console.log('Available models:', availableModels);
      
      setModels(availableModels);
      
      // Auto-select the first model if none is selected
      if (availableModels.length > 0 && !selectedModel) {
        const firstModel = availableModels[0].name;
        console.log('Auto-selecting model:', firstModel);
        setSelectedModel(firstModel);
      }
    } catch (err) {
      console.error('Error fetching models:', err);
      
      if (retryCount < 2) {
        // Retry up to 2 times
        console.log(`Retrying... (${retryCount + 1}/2)`);
        setTimeout(() => fetchModels(retryCount + 1), 1000);
        return;
      }
      
      setError(
        <span>
          Failed to connect to Ollama. Please ensure Ollama is running locally.
          <br />
          <button 
            onClick={() => fetchModels()} 
            className="mt-2 text-blue-600 dark:text-blue-400 hover:underline"
          >
            Retry
          </button>
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Run this command in your terminal to start Ollama: 
            <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
              ollama serve
            </code>
          </div>
        </span>
      );
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = (useLocal, model = '') => {
    try {
      const settings = { 
        useLocalModels: useLocal,
        selectedModel: model || selectedModel,
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      console.log('Settings saved:', settings);
      
      // Update state if needed
      if (useLocal !== undefined) setUseLocalModels(useLocal);
      if (model) setSelectedModel(model);
      
      return settings;
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Failed to save settings');
      throw error;
    }
  };

  const handleToggle = async (enabled) => {
    try {
      if (enabled && !models.length) {
        await fetchModels();
      }
      saveSettings(enabled, enabled ? selectedModel : '');
    } catch (error) {
      console.error('Error toggling local models:', error);
      // Revert the toggle if there was an error
      setUseLocalModels(!enabled);
    }
  };

  const handleModelChange = (e) => {
    const model = e.target.value;
    setSelectedModel(model);
    // Only save if local models are enabled
    if (useLocalModels) {
      saveSettings(true, model);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 mt-10 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Settings</h1>
      
      <div className="space-y-8">
        {/* Local Models Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Use Local Ollama Models
              {selectedModel && useLocalModels && (
                <span className="ml-2 text-sm font-normal text-blue-600 dark:text-blue-400">
                  (Selected: {selectedModel})
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {useLocalModels 
                ? 'Using local Ollama models. Models are loaded from your local Ollama instance.'
                : 'Enable to use models running on your local Ollama instance'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleToggle(!useLocalModels)}
            className={`${
              useLocalModels ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
            } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
            role="switch"
            aria-checked={useLocalModels}
          >
            <span
              className={`${
                useLocalModels ? 'translate-x-6' : 'translate-x-1'
              } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
            />
          </button>
        </div>

        {/* Model Selection */}
        {useLocalModels && (
          <div className="space-y-2">
            <label htmlFor="model-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Select Model
            </label>
            <div className="relative">
              <select
                id="model-select"
                value={selectedModel}
                onChange={handleModelChange}
                disabled={isLoading || models.length === 0}
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 pr-10 appearance-none bg-white"
              >
                {isLoading ? (
                  <option>Loading models...</option>
                ) : models.length === 0 ? (
                  <option>No models available</option>
                ) : (
                  models.map((model) => (
                    <option key={model.name} value={model.name}>
                      {model.name} ({Math.round(model.size / 1024 / 1024)}MB)
                    </option>
                  ))
                )}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
            {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
            {selectedModel && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Selected: {selectedModel}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}