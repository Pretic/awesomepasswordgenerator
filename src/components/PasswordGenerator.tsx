import { useState, useEffect, useCallback, useRef } from 'react';
import {
  generatePassword,
  generatePassphrase,
  type PasswordOptions,
  type PassphraseOptions,
  DEFAULT_PASSWORD_LENGTH,
  DEFAULT_PASSPHRASE_WORD_COUNT,
  DEFAULT_PASSPHRASE_SEPARATOR,
} from '../core';

type Mode = 'password' | 'passphrase';

interface StoredSettings {
  mode: Mode;
  length: number;
  include: {
    lowercase: boolean;
    uppercase: boolean;
    digits: boolean;
    symbols: boolean;
  };
  excludeAmbiguous: boolean;
  requireEachClass: boolean;
  // Passphrase settings
  wordCount: number;
  separator: string;
  capitalization: 'none' | 'first' | 'random';
  addDigit: boolean;
  addSymbol: boolean;
}

const STORAGE_KEY = 'password-generator-settings';

const defaultSettings: StoredSettings = {
  mode: 'password',
  length: DEFAULT_PASSWORD_LENGTH,
  include: {
    lowercase: true,
    uppercase: true,
    digits: true,
    symbols: false,
  },
  excludeAmbiguous: true,
  requireEachClass: true,
  wordCount: DEFAULT_PASSPHRASE_WORD_COUNT,
  separator: DEFAULT_PASSPHRASE_SEPARATOR,
  capitalization: 'none',
  addDigit: false,
  addSymbol: false,
};

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function parseStoredLength(value: unknown): number {
  if (Number.isInteger(value)) {
    return Math.max(8, Math.min(128, value as number));
  }
  return defaultSettings.length;
}

function parseStoredWordCount(value: unknown): number {
  if (Number.isInteger(value)) {
    return Math.max(3, Math.min(10, value as number));
  }
  return defaultSettings.wordCount;
}

function parseStoredBoolean(
  value: unknown,
  fallback: boolean
): boolean {
  return isBoolean(value) ? value : fallback;
}

function parseStoredSeparator(value: unknown): string {
  return isString(value) ? value : defaultSettings.separator;
}

export function loadSettings(): StoredSettings {
  if (typeof window === 'undefined') return defaultSettings;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate and merge with defaults
      return {
        mode: parsed.mode === 'passphrase' ? 'passphrase' : 'password',
        length: parseStoredLength(parsed.length),
        include: {
          lowercase: parseStoredBoolean(
            parsed.include?.lowercase,
            defaultSettings.include.lowercase
          ),
          uppercase: parseStoredBoolean(
            parsed.include?.uppercase,
            defaultSettings.include.uppercase
          ),
          digits: parseStoredBoolean(
            parsed.include?.digits,
            defaultSettings.include.digits
          ),
          symbols: parseStoredBoolean(
            parsed.include?.symbols,
            defaultSettings.include.symbols
          ),
        },
        excludeAmbiguous: parseStoredBoolean(
          parsed.excludeAmbiguous,
          defaultSettings.excludeAmbiguous
        ),
        requireEachClass: parseStoredBoolean(
          parsed.requireEachClass,
          defaultSettings.requireEachClass
        ),
        wordCount: parseStoredWordCount(parsed.wordCount),
        separator: parseStoredSeparator(parsed.separator),
        capitalization: ['none', 'first', 'random'].includes(parsed.capitalization)
          ? parsed.capitalization
          : defaultSettings.capitalization,
        addDigit: parseStoredBoolean(parsed.addDigit, defaultSettings.addDigit),
        addSymbol: parseStoredBoolean(parsed.addSymbol, defaultSettings.addSymbol),
      };
    }
  } catch (e) {
    // Ignore parse errors
  }
  return defaultSettings;
}

function saveSettings(settings: StoredSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    // Ignore storage errors
  }
}

function clearSettings(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // Ignore storage errors
  }
}

export default function PasswordGenerator() {
  const [settings, setSettings] = useState<StoredSettings>(loadSettings);
  const [password, setPassword] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const lengthInputRef = useRef<HTMLInputElement>(null);
  const wordCountInputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLInputElement>(null);
  const copyAnnouncementRef = useRef<HTMLDivElement>(null);


  const generate = useCallback(() => {
    try {
      if (settings.mode === 'passphrase') {
        const options: PassphraseOptions = {
          wordCount: settings.wordCount,
          separator: settings.separator,
          capitalization: settings.capitalization,
          addDigit: settings.addDigit,
          addSymbol: settings.addSymbol,
        };
        const newPassphrase = generatePassphrase(options);
        setPassword(newPassphrase);
      } else {
        const options: PasswordOptions = {
          length: settings.length,
          include: settings.include,
          excludeAmbiguous: settings.excludeAmbiguous,
          requireEachClass: settings.requireEachClass,
        };
        const newPassword = generatePassword(options);
        setPassword(newPassword);
      }
      setCopied(false);
    } catch (error) {
      // Should not happen with valid settings, but handle gracefully
      console.error('Generation error:', error);
    }
  }, [
    settings.mode,
    settings.length,
    settings.include,
    settings.excludeAmbiguous,
    settings.requireEachClass,
    settings.wordCount,
    settings.separator,
    settings.capitalization,
    settings.addDigit,
    settings.addSymbol,
  ]);

  // Save settings to localStorage when they change
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Regenerate when settings change
  useEffect(() => {
    generate();
  }, [generate]);

  const handleCopy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = password;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        // Ignore
      }
      document.body.removeChild(textArea);
    }
  };

  const updateSetting = <K extends keyof StoredSettings>(
    key: K,
    value: StoredSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const updateInclude = (
    key: keyof StoredSettings['include'],
    value: boolean
  ) => {
    setSettings((prev) => ({
      ...prev,
      include: { ...prev.include, [key]: value },
    }));
  };

  const handleResetSettings = () => {
    clearSettings();
    setSettings(defaultSettings);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'g':
          e.preventDefault();
          generate();
          break;
        case 'c':
          e.preventDefault();
          handleCopy();
          break;
        case 'l':
          e.preventDefault();
          // Focus length input in password mode, word count input in passphrase mode
          if (settings.mode === 'password') {
            lengthInputRef.current?.focus();
          } else {
            wordCountInputRef.current?.focus();
          }
          break;
        case 's':
          e.preventDefault();
          // Toggle symbols in password mode, toggle addSymbol in passphrase mode
          if (settings.mode === 'password') {
            updateInclude('symbols', !settings.include.symbols);
          } else {
            updateSetting('addSymbol', !settings.addSymbol);
          }
          break;
        case 'm':
          e.preventDefault();
          updateSetting('mode', settings.mode === 'password' ? 'passphrase' : 'password');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [generate, handleCopy, settings.include.symbols, settings.mode, settings.addSymbol]);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-6 sm:p-8 space-y-6">
      {/* 密码展示区域 */}
      <div className="space-y-4">
        <label htmlFor="password-output" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {settings.mode === 'passphrase' ? '生成的新密码短语' : '生成的新密码'}
        </label>
        <div className="relative">
          <input
            id="password-output"
            ref={outputRef}
            type="text"
            readOnly
            value={password}
            aria-label="生成的密码"
            className="w-full px-4 py-3 sm:py-4 text-lg sm:text-xl font-mono text-center bg-gray-50 dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent select-all text-gray-900 dark:text-gray-100 transition-colors"
          />
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className={`flex-1 px-4 py-2.5 sm:py-3 rounded-lg font-medium text-sm sm:text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              copied
                ? 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'
                : 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500'
            }`}
            aria-label="复制密码到剪贴板"
          >
            {copied ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                已复制！
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                复制密码
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={generate}
            className="flex-1 px-4 py-2.5 sm:py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg font-medium text-sm sm:text-base transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            aria-label="生成新密码"
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              生成新密码
            </span>
          </button>
        </div>
        <div
          ref={copyAnnouncementRef}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {copied ? '密码已复制到剪贴板' : ''}
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-6">
        {/* 模式切换 */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
            模式
          </label>
          <div className="relative inline-flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1 border border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => updateSetting('mode', 'password')}
              className={`relative px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 ${
                settings.mode === 'password'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              普通密码
            </button>
            <button
              type="button"
              onClick={() => updateSetting('mode', 'passphrase')}
              className={`relative px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 ${
                settings.mode === 'passphrase'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              密码短语 (词组)
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {settings.mode === 'password' 
              ? '根据自定义字符类型生成高强度随机密码'
              : '由多个随机单词拼接而成的高强度易记忆密码短语'}
          </p>
        </div>

        {settings.mode === 'password' ? (
          <>
            {/* 密码长度 */}
            <div className="space-y-3">
          <label htmlFor="length-slider" className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
            密码长度
          </label>
          <div className="flex gap-4 items-center">
            <input
              id="length-slider"
              type="range"
              min="8"
              max="128"
              value={settings.length}
              onChange={(e) =>
                updateSetting('length', parseInt(e.target.value, 10))
              }
              className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500"
              aria-label="密码长度"
            />
            <input
              ref={lengthInputRef}
              type="number"
              min="8"
              max="128"
              value={settings.length}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                if (!isNaN(value) && value >= 8 && value <= 128) {
                  updateSetting('length', value);
                }
              }}
              className="w-20 px-3 py-1.5 text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="密码长度 (数字输入)"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            密码越长越安全，建议至少保留 16 位以上。
          </p>
        </div>

        {/* 包含的字符类型 */}
        <div className="space-y-3">
          <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
            <legend className="px-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
              包含的字符类型
            </legend>
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
              勾选你希望包含在密码中的字符种类
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={settings.include.lowercase}
                  onChange={(e) =>
                    updateInclude('lowercase', e.target.checked)
                  }
                  className="w-5 h-5 text-blue-600 dark:text-blue-500 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 block">
                    小写字母
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    a, b, c, d...
                  </span>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={settings.include.uppercase}
                  onChange={(e) =>
                    updateInclude('uppercase', e.target.checked)
                  }
                  className="w-5 h-5 text-blue-600 dark:text-blue-500 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 block">
                    大写字母
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    A, B, C, D...
                  </span>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={settings.include.digits}
                  onChange={(e) => updateInclude('digits', e.target.checked)}
                  className="w-5 h-5 text-blue-600 dark:text-blue-500 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 block">
                    数字
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    0, 1, 2, 3...
                  </span>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={settings.include.symbols}
                  onChange={(e) => updateInclude('symbols', e.target.checked)}
                  className="w-5 h-5 text-blue-600 dark:text-blue-500 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 block">
                    特殊符号
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    !, @, #, $...
                  </span>
                </div>
              </label>
            </div>
          </fieldset>
        </div>

        {/* 排除易混淆字符 */}
        <label className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
          <input
            type="checkbox"
            checked={settings.excludeAmbiguous}
            onChange={(e) =>
              updateSetting('excludeAmbiguous', e.target.checked)
            }
            className="mt-0.5 w-5 h-5 text-blue-600 dark:text-blue-500 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
          />
          <div className="flex-1">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 block">
              排除易混淆字符
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              排除长相相似的字符（如 I, l, 1, O, 0 等），避免手动输入或辨认时出错
            </span>
          </div>
        </label>

        {/* 高级选项 */}
        <details
          className="group"
          open={showAdvanced}
          onToggle={(e) => setShowAdvanced((e.target as HTMLDetailsElement).open)}
        >
          <summary className="cursor-pointer list-none p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                高级选项
              </span>
              <svg 
                className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </summary>
          <div className="mt-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.requireEachClass}
                onChange={(e) =>
                  updateSetting('requireEachClass', e.target.checked)
                }
                className="mt-0.5 w-5 h-5 text-blue-600 dark:text-blue-500 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 block">
                  保证每类字符至少出现一次
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  确保生成的密码中包含上面所选的每一种字符类型至少一个
                </span>
              </div>
            </label>
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={handleResetSettings}
                className="w-full px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                aria-label="重置所有设置为默认值"
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  重置设置
                </span>
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                这将清除浏览器中保存的偏好，并恢复为系统默认设置
              </p>
            </div>
          </div>
        </details>
          </>
        ) : (
          <>
            {/* 密码短语单词数 */}
            <div className="space-y-3">
              <label htmlFor="word-count-slider" className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                单词数量
              </label>
              <div className="flex gap-4 items-center">
                <input
                  id="word-count-slider"
                  type="range"
                  min="3"
                  max="10"
                  value={settings.wordCount}
                  onChange={(e) =>
                    updateSetting('wordCount', parseInt(e.target.value, 10))
                  }
                  className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500"
                  aria-label="单词数量"
                />
                <input
                  ref={wordCountInputRef}
                  type="number"
                  min="3"
                  max="10"
                  value={settings.wordCount}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    if (!isNaN(value) && value >= 3 && value <= 10) {
                      updateSetting('wordCount', value);
                    }
                  }}
                  className="w-20 px-3 py-1.5 text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-label="单词数量 (数字输入)"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                单词越多密码越安全，建议至少保留 4 个单词。
              </p>
            </div>

            {/* 词组分隔符 */}
            <div className="space-y-3">
              <label htmlFor="separator-input" className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                单词分隔符
              </label>
              <input
                id="separator-input"
                type="text"
                maxLength={1}
                value={settings.separator}
                onChange={(e) => updateSetting('separator', e.target.value || '-')}
                className="w-20 px-3 py-1.5 text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                aria-label="单词分隔符"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                用于分隔每个单词的字符（例如 "-"、"_"、空格 或留空）
              </p>
            </div>

            {/* 大小写规则 */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                大小写规则
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="capitalization"
                    value="none"
                    checked={settings.capitalization === 'none'}
                    onChange={() => updateSetting('capitalization', 'none')}
                    className="w-4 h-4 text-blue-600 dark:text-blue-500 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">全小写 (默认)</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="capitalization"
                    value="first"
                    checked={settings.capitalization === 'first'}
                    onChange={() => updateSetting('capitalization', 'first')}
                    className="w-4 h-4 text-blue-600 dark:text-blue-500 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">每个单词首字母大写</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="capitalization"
                    value="random"
                    checked={settings.capitalization === 'random'}
                    onChange={() => updateSetting('capitalization', 'random')}
                    className="w-4 h-4 text-blue-600 dark:text-blue-500 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">随机将某个单词大写</span>
                </label>
              </div>
            </div>

            {/* 末尾添加数字/符号 */}
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={settings.addDigit}
                  onChange={(e) => updateSetting('addDigit', e.target.checked)}
                  className="mt-0.5 w-5 h-5 text-blue-600 dark:text-blue-500 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 block">
                    末尾附加随机数字
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    在密码短语结尾随机附加两位数字
                  </span>
                </div>
              </label>
              <label className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={settings.addSymbol}
                  onChange={(e) => updateSetting('addSymbol', e.target.checked)}
                  className="mt-0.5 w-5 h-5 text-blue-600 dark:text-blue-500 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 block">
                    末尾附加特殊符号
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    在密码短语结尾随机附加一个特殊符号
                  </span>
                </div>
              </label>
            </div>
          </>
        )}
      </div>

      {/* 快捷键提示 */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          <span className="font-medium">键盘快捷键：</span>{' '}
          <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">G</kbd> 生成新密码,{' '}
          <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">C</kbd> 复制,{' '}
          <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">L</kbd> 聚焦长度/单词数,{' '}
          <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">S</kbd> 切换特殊字符,{' '}
          <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">M</kbd> 切换生成模式
        </p>
      </div>
    </div>
  );
}
