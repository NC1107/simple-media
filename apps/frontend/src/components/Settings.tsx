import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../config'

interface SettingsState {
  movies_metadata_enabled: boolean
  tv_metadata_enabled: boolean
  books_metadata_enabled: boolean
}

function Settings() {
  const [settings, setSettings] = useState<SettingsState>({
    movies_metadata_enabled: false,
    tv_metadata_enabled: false,
    books_metadata_enabled: false
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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
        books_metadata_enabled: data.books_metadata_enabled === 'true'
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

      setSettings(prev => ({
        ...prev,
        [key]: value
      }))
    } catch (error) {
      console.error('Failed to update setting:', error)
      alert('Failed to update setting. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100">Settings</h1>
        <div className="text-gray-600 dark:text-gray-400">Loading settings...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100">Settings</h1>

      <div className="max-w-3xl space-y-6">
        {/* Movies Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Movies</h2>
          
          <div className="space-y-4">
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
          </div>
        </div>

        {/* TV Shows Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">TV Shows</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-700 dark:text-gray-300">
                  Enable Metadata Scanning
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Automatically fetch TV show metadata from TMDB during library scans
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
          </div>
        </div>

        {/* Books Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Books</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-700 dark:text-gray-300">
                  Enable Metadata Scanning
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Automatically fetch book metadata during library scans
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
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> These settings only affect automatic scanning. You can manually fetch metadata for individual items regardless of these settings.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Settings
