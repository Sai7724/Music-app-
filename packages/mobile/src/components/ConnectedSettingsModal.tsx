import { Sliders, SunMoon, Palette } from 'lucide-react';
import { FC, useState } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import {
  SettingsNavigationSection,
  SettingsPanel,
  Slider,
  ThemeController,
  Toggle,
} from '@nuclearplayer/ui';
import { listBasicThemes, setBasicTheme } from '@nuclearplayer/themes';

import { useCoreSetting } from '../hooks/useCoreSetting';

type ConnectedSettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

// ── Theme swatch ──────────────────────────────────────────────────────────────
const ThemeSwatch: FC<{
  id: string;
  name: string;
  palette: [string, string, string, string];
  isActive: boolean;
  onClick: () => void;
}> = ({ name, palette, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`
      flex flex-col items-center gap-2 rounded-xl p-2 border-2 transition-all
      ${isActive ? 'border-primary scale-105 shadow-md' : 'border-transparent hover:border-border'}
    `}
    title={name}
  >
    {/* 4-colour palette preview */}
    <div className="grid grid-cols-2 size-12 rounded-lg overflow-hidden border border-border">
      {palette.map((color, i) => (
        <div key={i} style={{ backgroundColor: color }} />
      ))}
    </div>
    <span className={`text-[10px] font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
      {name}
    </span>
  </button>
);

// ── Main modal ────────────────────────────────────────────────────────────────
export const ConnectedSettingsModal: FC<ConnectedSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation('preferences');
  const [activeSection, setActiveSection] = useState<'playback' | 'appearance'>('playback');

  const [volume, setVolume] = useCoreSetting<number>('playback.volume');
  const [shuffle, setShuffle] = useCoreSetting<boolean>('playback.shuffle');
  const [historyEnabled, setHistoryEnabled] = useCoreSetting<boolean>('history.enabled');
  const [isDark, setIsDark] = useCoreSetting<boolean>('theme.dark');
  const [themeId, setThemeId] = useCoreSetting<string>('theme.id');

  const themes = listBasicThemes();

  const handleThemeChange = (newIsDark: boolean) => {
    void setIsDark(newIsDark);
    // ThemeController already sets data-theme on <html>
  };

  const handleSelectTheme = (id: string) => {
    setBasicTheme(id); // sets data-theme-id on <html> immediately
    void setThemeId(id); // persists to settings store
  };

  const sections: SettingsNavigationSection[] = [
    {
      id: 'general',
      label: t('title') ?? 'Settings',
      activeItemId: activeSection,
      onSelect: (id) => setActiveSection(id as 'playback' | 'appearance'),
      items: [
        {
          id: 'playback',
          label: t('sections.playback') ?? 'Playback',
          icon: <Sliders size={18} />,
        },
        {
          id: 'appearance',
          label: t('sections.appearance') ?? 'Appearance',
          icon: <Palette size={18} />,
        },
      ],
    },
  ];

  return (
    <SettingsPanel
      isOpen={isOpen}
      onClose={onClose}
      sections={sections}
    >
      <div className="flex flex-col gap-6 p-6 max-w-md">

        {/* ── Playback section ────────────────────────────── */}
        {activeSection === 'playback' && (
          <>
            <div>
              <h3 className="text-lg font-bold mb-1">
                {t('sections.playback') ?? 'Playback'}
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                {t('sections.playbackDescription') ?? 'Configure your audio experience.'}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">
                {t('volume') ?? 'Volume'}
              </label>
              <Slider
                value={Math.round((volume ?? 1) * 100)}
                onValueChange={(val) => void setVolume(val / 100)}
                showValue
                className="flex-1"
              />
            </div>

            <div className="flex items-center justify-between py-2 border-t border-border">
              <div>
                <p className="text-sm font-medium">{t('shuffle') ?? 'Shuffle'}</p>
                <p className="text-xs text-muted-foreground">
                  {t('shuffleDescription') ?? 'Randomize playback order'}
                </p>
              </div>
              <Toggle checked={shuffle ?? false} onChange={(v) => void setShuffle(v)} />
            </div>

            <div className="flex items-center justify-between py-2 border-t border-border">
              <div>
                <p className="text-sm font-medium">
                  {t('listeningHistory') ?? 'Listening History'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('listeningHistoryDescription') ?? 'Keep record of played tracks'}
                </p>
              </div>
              <Toggle
                checked={historyEnabled ?? true}
                onChange={(v) => void setHistoryEnabled(v)}
              />
            </div>
          </>
        )}

        {/* ── Appearance section ───────────────────────────── */}
        {activeSection === 'appearance' && (
          <>
            <div>
              <h3 className="text-lg font-bold mb-1">
                {t('sections.appearance') ?? 'Appearance'}
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                {t('sections.appearanceDescription') ?? 'Customize colors and theme.'}
              </p>
            </div>

            {/* Dark / light toggle — same ThemeController as desktop */}
            <div className="flex items-center justify-between py-2 border-t border-border">
              <div className="flex items-center gap-2">
                <SunMoon size={16} className="text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {t('darkMode') ?? 'Dark Mode'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('darkModeDescription') ?? 'Toggle dark or light theme'}
                  </p>
                </div>
              </div>
              <ThemeController
                isDark={isDark ?? true}
                onThemeChange={handleThemeChange}
              />
            </div>

            {/* Colour theme picker — exact same themes as desktop */}
            <div className="py-2 border-t border-border">
              <div className="flex items-center gap-2 mb-4">
                <Palette size={16} className="text-muted-foreground" />
                <p className="text-sm font-medium">
                  {t('colorTheme') ?? 'Colour Theme'}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 justify-start">
                {themes.map((theme) => (
                  <ThemeSwatch
                    key={theme.id}
                    id={theme.id}
                    name={theme.name}
                    palette={theme.palette}
                    isActive={(themeId ?? 'nuclear:default') === theme.id}
                    onClick={() => handleSelectTheme(theme.id)}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </SettingsPanel>
  );
};
