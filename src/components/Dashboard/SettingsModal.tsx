import { useState, useEffect } from 'react';
import { X, Settings, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [tested, setTested] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('youtube_api_key');
    if (stored) {
      setApiKey(stored);
    }
  }, []);

  const validateApiKey = async (key: string) => {
    if (!key.trim()) {
      setError('API key cannot be empty');
      return false;
    }

    setIsValidating(true);
    setError('');
    setSaved(false);
    setTested(false);

    const redactedKey = `${key.slice(0, 4)}...${key.slice(-4)}`;

    try {
      const testUrl = `https://www.googleapis.com/youtube/v3/videos?part=id&id=test&key=${key}`;
      const loggedUrl = testUrl.replace(key, '***REDACTED***');
      console.log('[YouTube API Key Test] Starting validation');
      console.log('[YouTube API Key Test] Key provided:', !!key);
      console.log('[YouTube API Key Test] Key preview:', redactedKey);
      console.log('[YouTube API Key Test] Request URL:', loggedUrl);

      const response = await fetch(testUrl);
      console.log('[YouTube API Key Test] Response status:', response.status, response.statusText);

      const bodyText = await response.text().catch(() => '');
      console.log('[YouTube API Key Test] Response body (raw):', bodyText);

      if (response.status === 403) {
        setError('Invalid API key. Please check your YouTube Data API key.');
        return false;
      }

      if (response.status === 400) {
        setError('Invalid API key format.');
        return false;
      }

      if (!response.ok) {
        setError('Failed to validate API key. Please try again.');
        return false;
      }

      return true;
    } catch (err) {
      console.error('[YouTube API Key Test] Validation failed (full details):', err);
      setError('Check your internet connection');
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const handleTest = async () => {
    const isValid = await validateApiKey(apiKey);
    if (isValid) {
      setTested(true);
    }
  };

  const handleSave = async () => {
    const isValid = await validateApiKey(apiKey);
    if (isValid) {
      localStorage.setItem('youtube_api_key', apiKey);
      setSaved(true);
      setTested(false);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to remove your API key?')) {
      localStorage.removeItem('youtube_api_key');
      setApiKey('');
      setSaved(false);
      setTested(false);
      setError('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="card max-w-md w-full">
        <div className="bg-[#27272a] border-b border-zinc-700 p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Settings className="w-6 h-6 text-zinc-400" />
            <h2 className="text-xl font-bold text-white">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-700 rounded transition"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">YouTube Data API</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Add your YouTube Data API key to enable full playlist importing with video metadata, thumbnails, and channel information.
            </p>

            <div className="space-y-2 mb-4">
              <label className="block text-sm font-medium text-white">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setError('');
                    setSaved(false);
                  }}
                  className="input pr-10"
                  placeholder="Enter your YouTube Data API key"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-zinc-700 rounded transition"
                >
                  {showKey ? (
                    <EyeOff className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-zinc-400" />
                  )}
                </button>
              </div>
              <p className="text-xs text-zinc-500">
                Your key is stored locally in your browser. Never shared with anyone.
              </p>
            </div>

            {error && (
              <div className="flex items-start space-x-2 bg-red-500/20 border border-red-500/50 text-red-200 px-3 py-2 rounded-lg mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p className="text-xs">{error}</p>
              </div>
            )}

            {tested && (
              <div className="flex items-start space-x-2 bg-green-500/20 border border-green-500/50 text-green-200 px-3 py-2 rounded-lg mb-4">
                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p className="text-xs">API key is valid!</p>
              </div>
            )}

            {saved && (
              <div className="flex items-start space-x-2 bg-green-500/20 border border-green-500/50 text-green-200 px-3 py-2 rounded-lg mb-4">
                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p className="text-xs">API key saved successfully!</p>
              </div>
            )}

            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-xs text-zinc-300 space-y-2">
              <p className="font-medium text-zinc-200">How to get your API key:</p>
              <ol className="list-decimal list-inside space-y-1 text-zinc-400">
                <li>Go to Google Cloud Console</li>
                <li>Create a new project</li>
                <li>Enable YouTube Data API v3</li>
                <li>Create an API key credential</li>
                <li>Paste the key above</li>
              </ol>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-zinc-700">
            {apiKey && (
              <button
                onClick={handleClear}
                className="btn-secondary"
              >
                Clear
              </button>
            )}
            <button
              onClick={handleTest}
              disabled={isValidating || !apiKey}
              className="btn-secondary"
            >
              {isValidating ? 'Testing...' : 'Test API Key'}
            </button>
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              disabled={isValidating || !apiKey}
              className="btn-primary"
            >
              {isValidating ? 'Validating...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
