import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../config'
import { showToast, ConfirmDialog } from './Toast'

interface SettingsState {
  movies_metadata_enabled: boolean
  tv_metadata_enabled: boolean
  tv_episodes_metadata_enabled: boolean
  books_metadata_enabled: boolean
  save_images_locally: boolean
}

function Settings() {
  const [settings, setSettings] = useState<SettingsState>({
    movies_metadata_enabled: false,
    tv_metadata_enabled: false,
    tv_episodes_metadata_enabled: false,
    books_metadata_enabled: false,
    save_images_locally: false
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [clearingMovies, setClearingMovies] = useState(false)
  const [clearingTV, setClearingTV] = useState(false)
  const [clearingBooks, setClearingBooks] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{ type: string; isOpen: boolean }>({ type: '', isOpen: false })
  const [testingTMDB, setTestingTMDB] = useState(false)
  const [testingTVDB, setTestingTVDB] = useState(false)
  const [testingHardcover, setTestingHardcover] = useState(false)
  const [tmdbResult, setTmdbResult] = useState<{ success: boolean; message: string } | null>(null)
  const [tvdbResult, setTvdbResult] = useState<{ success: boolean; message: string } | null>(null)
  const [hardcoverResult, setHardcoverResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      console.log('Fetching settings from API')
      const response = await fetch(`${API_BASE_URL}/api/settings`)
      const data = await response.json()
      
      console.log('Settings received:', data)
      
      setSettings({
        movies_metadata_enabled: data.movies_metadata_enabled === 'true',
        tv_metadata_enabled: data.tv_metadata_enabled === 'true',
        tv_episodes_metadata_enabled: data.tv_episodes_metadata_enabled === 'true',
        books_metadata_enabled: data.books_metadata_enabled === 'true',
        save_images_locally: data.save_images_locally === 'true'
      })
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = async (key: string, value: boolean) => {
    setSaving(true)
    try {
      console.log(`Updating setting: ${key} = ${value}`)
      
      const response = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          key,
          value: value.toString()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update setting')
      }

      const result = await response.json()
      console.log('Setting updated successfully:', result)

      setSettings((prev: SettingsState) => ({
        ...prev,
        [key]: value
      }))
    } catch (error) {
      console.error('Failed to update setting:', error)
      showToast('Failed to update setting. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleClearMoviesMetadata = async () => {
    setConfirmDialog({ type: '', isOpen: false })
    setClearingMovies(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/metadata/clear/movies`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to clear metadata')
      }

      const result = await response.json()
      showToast(`Movie metadata cleared: ${result.cleared} items`, 'success')
    } catch (error) {
      console.error('Failed to clear movie metadata:', error)
      showToast('Failed to clear movie metadata. Please try again.', 'error')
    } finally {
      setClearingMovies(false)
    }
  }

  const handleClearTVMetadata = async () => {
    setConfirmDialog({ type: '', isOpen: false })
    setClearingTV(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/metadata/clear/tv`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to clear metadata')
      }

      const result = await response.json()
      showToast(`TV show metadata cleared: ${result.cleared} items`, 'success')
    } catch (error) {
      console.error('Failed to clear TV metadata:', error)
      showToast('Failed to clear TV metadata. Please try again.', 'error')
    } finally {
      setClearingTV(false)
    }
  }

  const handleClearBooksMetadata = async () => {
    setConfirmDialog({ type: '', isOpen: false })
    setClearingBooks(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/metadata/clear/books`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to clear metadata')
      }

      const result = await response.json()
      showToast(`Book metadata cleared: ${result.cleared} items`, 'success')
    } catch (error) {
      console.error('Failed to clear book metadata:', error)
      showToast('Failed to clear book metadata. Please try again.', 'error')
    } finally {
      setClearingBooks(false)
    }
  }

  const handleTestTMDB = async () => {
    setTestingTMDB(true)
    setTmdbResult(null)
    try {
      const response = await fetch(`${API_BASE_URL}/api/test-api-connections`)
      
      if (!response.ok) {
        throw new Error('Failed to test TMDB connection')
      }

      const results = await response.json()
      setTmdbResult(results.tmdb)
      
      if (results.tmdb.success) {
        showToast('TMDB connection successful', 'success')
      } else {
        showToast('TMDB connection failed', 'error')
      }
    } catch (error) {
      console.error('Failed to test TMDB connection:', error)
      showToast('Failed to test TMDB connection', 'error')
    } finally {
      setTestingTMDB(false)
    }
  }

  const handleTestTVDB = async () => {
    setTestingTVDB(true)
    setTvdbResult(null)
    try {
      const response = await fetch(`${API_BASE_URL}/api/test-api-connections`)
      
      if (!response.ok) {
        throw new Error('Failed to test TVDB connection')
      }

      const results = await response.json()
      setTvdbResult(results.tvdb)
      
      if (results.tvdb.success) {
        showToast('TVDB connection successful', 'success')
      } else {
        showToast('TVDB connection failed', 'error')
      }
    } catch (error) {
      console.error('Failed to test TVDB connection:', error)
      showToast('Failed to test TVDB connection', 'error')
    } finally {
      setTestingTVDB(false)
    }
  }

  const handleTestHardcover = async () => {
    setTestingHardcover(true)
    setHardcoverResult(null)
    try {
      const response = await fetch(`${API_BASE_URL}/api/test-api-connections`)
      
      if (!response.ok) {
        throw new Error('Failed to test Hardcover connection')
      }

      const results = await response.json()
      setHardcoverResult(results.hardcover)
      
      if (results.hardcover.success) {
        showToast('Hardcover connection successful', 'success')
      } else {
        showToast('Hardcover connection failed', 'error')
      }
    } catch (error) {
      console.error('Failed to test Hardcover connection:', error)
      showToast('Failed to test Hardcover connection', 'error')
    } finally {
      setTestingHardcover(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">Settings</h1>
        <div className="text-gray-600 dark:text-gray-400">Loading settings...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">Settings</h1>

      <div className="max-w-3xl space-y-4">
        {/* Movies Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-100">Movies</h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-700 dark:text-gray-300">
                  Enable Metadata Scanning
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Automatically fetch movie metadata from TMDB during library scans
                </p>
              </div>
              <button
                onClick={() => updateSetting('movies_metadata_enabled', !settings.movies_metadata_enabled)}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.movies_metadata_enabled
                    ? 'bg-blue-600'
                    : 'bg-gray-200 dark:bg-gray-700'
                } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.movies_metadata_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="mb-3">
                <button
                  onClick={handleTestTMDB}
                  disabled={testingTMDB}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {testingTMDB ? 'Testing...' : 'Test TMDB Connection'}
                </button>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Test your TMDB API connection for movie metadata.
                </p>
                {tmdbResult && (
                  <div className={`p-3 rounded-lg mt-3 ${tmdbResult.success ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800 dark:text-gray-200">Status</span>
                      {tmdbResult.success ? (
                        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <p className={`text-sm mt-1 ${tmdbResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                      {tmdbResult.message}
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setConfirmDialog({ type: 'movie', isOpen: true })}
                  disabled={clearingMovies}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {clearingMovies ? 'Clearing...' : 'Clear Movie Metadata'}
                </button>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Remove all metadata for movies. The movie files will remain in your library.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* TV Shows Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-100">TV Shows</h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-700 dark:text-gray-300">
                  Enable Metadata Scanning
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Automatically fetch TV show metadata from TVDB during library scans
                </p>
              </div>
              <button
                onClick={() => updateSetting('tv_metadata_enabled', !settings.tv_metadata_enabled)}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.tv_metadata_enabled
                    ? 'bg-blue-600'
                    : 'bg-gray-200 dark:bg-gray-700'
                } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.tv_metadata_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
              <div>
                <label className="font-medium text-gray-700 dark:text-gray-300">
                  Enable Episode Metadata Scanning
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Automatically fetch episode metadata from TVDB during library scans (slower)
                </p>
              </div>
              <button
                onClick={() => updateSetting('tv_episodes_metadata_enabled', !settings.tv_episodes_metadata_enabled)}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.tv_episodes_metadata_enabled
                    ? 'bg-blue-600'
                    : 'bg-gray-200 dark:bg-gray-700'
                } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.tv_episodes_metadata_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="mb-3">
                <button
                  onClick={handleTestTVDB}
                  disabled={testingTVDB}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {testingTVDB ? 'Testing...' : 'Test TVDB Connection'}
                </button>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Test your TVDB API connection for TV show metadata.
                </p>
                {tvdbResult && (
                  <div className={`p-3 rounded-lg mt-3 ${tvdbResult.success ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800 dark:text-gray-200">Status</span>
                      {tvdbResult.success ? (
                        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <p className={`text-sm mt-1 ${tvdbResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                      {tvdbResult.message}
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setConfirmDialog({ type: 'TV show', isOpen: true })}
                  disabled={clearingTV}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {clearingTV ? 'Clearing...' : 'Clear TV Show Metadata'}
                </button>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Remove all metadata for TV shows. The show files will remain in your library.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Books Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-100">Books</h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-700 dark:text-gray-300">
                  Enable Metadata Scanning
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Automatically fetch book metadata from Hardcover during library scans
                </p>
              </div>
              <button
                onClick={() => updateSetting('books_metadata_enabled', !settings.books_metadata_enabled)}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.books_metadata_enabled
                    ? 'bg-blue-600'
                    : 'bg-gray-200 dark:bg-gray-700'
                } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.books_metadata_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="mb-3">
                <button
                  onClick={handleTestHardcover}
                  disabled={testingHardcover}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {testingHardcover ? 'Testing...' : 'Test Hardcover Connection'}
                </button>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Test your Hardcover API connection for book metadata.
                </p>
                {hardcoverResult && (
                  <div className={`p-3 rounded-lg mt-3 ${hardcoverResult.success ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800 dark:text-gray-200">Status</span>
                      {hardcoverResult.success ? (
                        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <p className={`text-sm mt-1 ${hardcoverResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                      {hardcoverResult.message}
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setConfirmDialog({ type: 'book', isOpen: true })}
                  disabled={clearingBooks}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {clearingBooks ? 'Clearing...' : 'Clear Book Metadata'}
                </button>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Remove all metadata for books. The book files will remain in your library.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* General Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-100">General</h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-700 dark:text-gray-300">
                  Save Images Locally
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Download poster and thumbnail images alongside media files (in poster.jpg/thumb.jpg)
                </p>
              </div>
              <button
                onClick={() => updateSetting('save_images_locally', !settings.save_images_locally)}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.save_images_locally
                    ? 'bg-blue-600'
                    : 'bg-gray-200 dark:bg-gray-700'
                } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.save_images_locally ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> These settings only affect automatic scanning. You can manually fetch metadata for individual items regardless of these settings.
          </p>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Clear Metadata?"
        message={`Are you sure you want to clear all ${confirmDialog.type} metadata? This will not delete the ${confirmDialog.type} themselves.`}
        onConfirm={() => {
          if (confirmDialog.type === 'movie') handleClearMoviesMetadata()
          else if (confirmDialog.type === 'TV show') handleClearTVMetadata()
          else if (confirmDialog.type === 'book') handleClearBooksMetadata()
        }}
        onCancel={() => setConfirmDialog({ type: '', isOpen: false })}
        confirmText="Clear Metadata"
        cancelText="Cancel"
      />
    </div>
  )
}

export default Settings
