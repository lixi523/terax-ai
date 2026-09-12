import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  type OsNotificationResult,
  testAgentOsNotification,
} from "@/modules/agents/lib/notify";
import { usePreferencesStore } from "@/modules/settings/preferences";
import type { ThemePref } from "@/modules/settings/store";
import {
  setAgentNotificationSound,
  setAgentNotifications,
  setAutostart,
  setConfirmCloseRunningTerminal,
  setDefaultWorkspaceEnv,
  setExplorerGitDecorations,
  setLocale,
  setRestoreWindowState,
  setShowHidden,
  setTerminalCursorBlink,
  setTerminalCursorStyle,
  setTerminalFontFamily,
  setTerminalFontSize,
  setTerminalFontWeight,
  setTerminalLetterSpacing,
  setTerminalScrollback,
  setTerminalShell,
  setTerminalRenderer,
  setTerminalScreenReader,
  setZoomLevel,
  TERMINAL_FONT_SIZES,
  TERMINAL_SCROLLBACK_PRESETS,
} from "@/modules/settings/store";
import { useTheme } from "@/modules/theme";
import {
  ComputerIcon,
  Moon02Icon,
  Sun03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { invoke } from "@tauri-apps/api/core";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { useEffect, useState } from "react";
import { SectionHeader } from "../components/SectionHeader";
import { SettingRow } from "../components/SettingRow";
import { useTranslation } from "@/i18n";

const APPEARANCE: {
  id: ThemePref;
  label: string;
  icon: typeof ComputerIcon;
}[] = [
  { id: "system", label: "System", icon: ComputerIcon },
  { id: "light", label: "Light", icon: Sun03Icon },
  { id: "dark", label: "Dark", icon: Moon02Icon },
];

const TERMINAL_FONT_WEIGHTS = [
  { value: "normal", label: "Normal" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semi-Bold" },
  { value: "bold", label: "Bold" },
] as const;
const TERMINAL_CURSOR_STYLES = [
  { value: "bar", label: "Bar" },
  { value: "block", label: "Block" },
  { value: "underline", label: "Underline" },
] as const;
const LETTER_SPACINGS = [-4, -3, -2, -1, 0, 1, 2, 3, 4] as const;

type ShellInfo = { name: string; path: string; integrated: boolean };
const SHELL_AUTO = "auto";
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.05;
const NOTIFICATION_TEST_DELAY_MS = 2_000;

type NotificationTestState =
  | OsNotificationResult
  | "idle"
  | "waiting"
  | "sending";

export function GeneralSection() {
  const { t } = useTranslation('settings.general');
  const { mode, setMode } = useTheme();

  const autostart = usePreferencesStore((s) => s.autostart);
  const restoreWindowState = usePreferencesStore((s) => s.restoreWindowState);
  const showHidden = usePreferencesStore((s) => s.showHidden);
  const explorerGitDecorations = usePreferencesStore(
    (s) => s.explorerGitDecorations,
  );
  const terminalRenderer = usePreferencesStore((s) => s.terminalRenderer);
  const terminalScreenReader = usePreferencesStore(
    (s) => s.terminalScreenReader,
  );
  const terminalCursorBlink = usePreferencesStore((s) => s.terminalCursorBlink);
  const terminalCursorStyle = usePreferencesStore((s) => s.terminalCursorStyle);
  const terminalFontFamily = usePreferencesStore((s) => s.terminalFontFamily);
  const terminalFontWeight = usePreferencesStore((s) => s.terminalFontWeight);
  const terminalShell = usePreferencesStore((s) => s.terminalShell);
  const [shells, setShells] = useState<ShellInfo[]>([]);
  const [wslDistros, setWslDistros] = useState<{ name: string }[]>([]);
  const defaultWorkspaceEnv = usePreferencesStore((s) => s.defaultWorkspaceEnv);
  const terminalLetterSpacing = usePreferencesStore(
    (s) => s.terminalLetterSpacing,
  );
  const terminalFontSize = usePreferencesStore((s) => s.terminalFontSize);
  const terminalScrollback = usePreferencesStore((s) => s.terminalScrollback);
  const confirmCloseRunningTerminal = usePreferencesStore(
    (s) => s.confirmCloseRunningTerminal,
  );
  const zoomLevel = usePreferencesStore((s) => s.zoomLevel);
  const agentNotifications = usePreferencesStore((s) => s.agentNotifications);
  const agentNotificationSound = usePreferencesStore(
    (s) => s.agentNotificationSound,
  );
  const locale = usePreferencesStore((s) => s.locale);
  const [notificationTest, setNotificationTest] =
    useState<NotificationTestState>("idle");
  const notificationTestPending =
    notificationTest === "waiting" || notificationTest === "sending";

  const testNotification = async () => {
    setNotificationTest("waiting");
    await new Promise((resolve) =>
      setTimeout(resolve, NOTIFICATION_TEST_DELAY_MS),
    );
    setNotificationTest("sending");
    setNotificationTest(await testAgentOsNotification(agentNotificationSound));
  };

  useEffect(() => {
    let alive = true;
    void isEnabled()
      .then((on) => {
        if (!alive) return;
        if (on !== usePreferencesStore.getState().autostart) {
          void setAutostart(on);
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    void invoke<ShellInfo[]>("pty_list_shells")
      .then(setShells)
      .catch(() => {});
    void invoke<{ name: string }[]>("wsl_list_distros")
      .then(setWslDistros)
      .catch(() => {});
  }, []);

  const onToggleAutostart = async (next: boolean) => {
    try {
      if (next) await enable();
      else await disable();
      await setAutostart(next);
    } catch (e) {
      console.error("autostart toggle failed", e);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title={t('title')}
        description={t('description')}
      />

      <div className="flex flex-col gap-2">
        <Label>{t('appearance')}</Label>
        <div className="grid grid-cols-3 gap-2">
          {APPEARANCE.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setMode(o.id)}
              className={cn(
                "group flex h-20 flex-col items-center justify-center gap-1.5 rounded-lg border bg-card transition-all",
                mode === o.id
                  ? "border-foreground/60 ring-1 ring-foreground/20"
                  : "border-border/60 hover:border-border",
              )}
            >
              <HugeiconsIcon icon={o.icon} size={18} strokeWidth={1.5} />
              <span className="text-[11.5px]">{o.label}</span>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {t('themeTabNote')}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label>{t('appLanguage')}</Label>
        <SettingRow
          title={t('appLanguage')}
          description={t('appLanguageDescription')}
        >
          <Select value={locale} onValueChange={(value) => void setLocale(value as "system" | "en" | "zh-CN")}>
            <SelectTrigger className="h-8 w-40 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">{t('settings.general.language.option.system')}</SelectItem>
              <SelectItem value="en">{t('settings.general.language.option.en')}</SelectItem>
              <SelectItem value="zh-CN">{t('settings.general.language.option.zh-CN')}</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
      </div>

      <div className="flex flex-col gap-2">
        <Label>{t('zoom')}</Label>
        <div className="flex flex-col gap-3 rounded-lg border border-border/60 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11.5px] text-muted-foreground">
              {t('zoomLevel')}
            </span>
            <span className="tabular-nums text-[11px] text-muted-foreground">
              {Math.round(zoomLevel * 100)}%
            </span>
          </div>
          <Slider
            value={[zoomLevel]}
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={ZOOM_STEP}
            onValueChange={(v) => void setZoomLevel(v[0] ?? 1)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>{t('explorer')}</Label>
        <SettingRow
          title={t('showHiddenFiles')}
          description={t('showHiddenFilesDescription')}
        >
          <Switch
            checked={showHidden}
            onCheckedChange={(v) => void setShowHidden(v)}
          />
        </SettingRow>
        <SettingRow
          title={t('gitDecorations')}
          description={t('gitDecorationsDescription')}
        >
          <Switch
            checked={explorerGitDecorations}
            onCheckedChange={(v) => void setExplorerGitDecorations(v)}
          />
        </SettingRow>
      </div>

      <div className="flex flex-col gap-2">
        <Label>{t('terminal')}</Label>
        <SettingRow
          title={t('terminalRenderer')}
          description={t('terminalRendererDescription')}
        >
          <Select
            value={terminalRenderer}
            onValueChange={(value) =>
              void setTerminalRenderer(value === "webgl" ? "webgl" : "auto")
            }
          >
            <SelectTrigger className="h-8 w-36 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">{t('automatic')}</SelectItem>
              <SelectItem value="webgl">{t('webgl')}</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow
          title={t('screenReaderSupport')}
          description={t('screenReaderDescription')}
        >
          <Switch
            checked={terminalScreenReader}
            onCheckedChange={(value) => void setTerminalScreenReader(value)}
          />
        </SettingRow>
        <SettingRow
          title={t('cursorBlinking')}
          description={t('cursorBlinkingDescription')}
        >
          <Switch
            checked={terminalCursorBlink}
            onCheckedChange={(v) => void setTerminalCursorBlink(v)}
          />
        </SettingRow>
        <SettingRow
          title={t('cursorStyle')}
          description={t('cursorStyleDescription')}
        >
          <Select
            value={terminalCursorStyle}
            onValueChange={(v) => void setTerminalCursorStyle(v)}
          >
            <SelectTrigger
              value={terminalCursorStyle}
              className="h-8 w-28 text-[12px]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TERMINAL_CURSOR_STYLES.map((style) => (
                <SelectItem
                  key={style.value}
                  value={style.value}
                  className="text-[12px]"
                >
                  {style.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        <FontFamilyInput
          value={terminalFontFamily}
          onCommit={(v) => void setTerminalFontFamily(v)}
        />
        <SettingRow
          title={t('fontWeight')}
          description={t('fontWeightDescriptionTerminal')}
        >
          <Select
            value={terminalFontWeight}
            onValueChange={(v) => void setTerminalFontWeight(v)}
          >
            <SelectTrigger
              value={terminalFontWeight}
              className="h-8 w-28 text-[12px]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TERMINAL_FONT_WEIGHTS.map((w) => (
                <SelectItem
                  key={w.value}
                  value={w.value}
                  className="text-[12px]"
                >
                  {w.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow
          title={t('integratedTerminalShell')}
          description={
            shells.find((s) => s.path === terminalShell)?.integrated === false
              ? t('shellNotIntegrated')
              : wslDistros.length > 0
                ? t('shellIntegrated')
                : t('shellNewTabs')
          }
        >
          <Select
            value={terminalShell || SHELL_AUTO}
            onValueChange={(v) =>
              void setTerminalShell(v === SHELL_AUTO ? "" : v)
            }
          >
            <SelectTrigger
              value={terminalShell || SHELL_AUTO}
              className="h-8 w-40 text-[12px]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SHELL_AUTO} className="text-[12px]">
                {t('shellAuto')}
              </SelectItem>
              {shells.map((s) => (
                <SelectItem key={s.path} value={s.path} className="text-[12px]">
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        {(wslDistros.length > 0 || defaultWorkspaceEnv !== "local") && (
          <SettingRow
            title={t('workspaceEnvironment')}
            description={t('workspaceEnvironmentDescription')}
>
                <Select
                  value={defaultWorkspaceEnv}
                  onValueChange={(v) => void setDefaultWorkspaceEnv(v)}
                >
                  <SelectTrigger
                    value={defaultWorkspaceEnv}
                    className="h-8 w-40 text-[12px]"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local" className="text-[12px]">
                      {t('local')}
                    </SelectItem>
                    {wslDistros.map((d) => (
                      <SelectItem
                        key={d.name}
                        value={`wsl:${d.name}`}
                        className="text-[12px]"
                      >
                        WSL: {d.name}
                      </SelectItem>
                    ))}
                    {defaultWorkspaceEnv.startsWith("wsl:") &&
                      !wslDistros.some(
                        (d) => `wsl:${d.name}` === defaultWorkspaceEnv,
                      ) && (
                        <SelectItem
                          value={defaultWorkspaceEnv}
                          className="text-[12px]"
                        >
                          {defaultWorkspaceEnv.slice("wsl:".length)} {t('unavailable')}
                        </SelectItem>
                      )}
                  </SelectContent>
                </Select>
              </SettingRow>
            )}
            <SettingRow
              title={t('letterSpacing')}
              description={t('letterSpacingDescription')}
            >
              <Select
                value={String(terminalLetterSpacing)}
                onValueChange={(v) => void setTerminalLetterSpacing(Number(v))}
              >
                <SelectTrigger size="sm" className="h-8 w-28 text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LETTER_SPACINGS.map((v) => (
                    <SelectItem key={v} value={String(v)} className="text-[12px]">
                      {v > 0 ? `+${v}` : v} {t('px')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingRow>
            <SettingRow title={t('fontSize')} description={t('fontSizeDescriptionTerminal')}>
          <Select
            value={String(terminalFontSize)}
            onValueChange={(v) => void setTerminalFontSize(Number(v))}
          >
            <SelectTrigger size="sm" className="h-8 w-28 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
{TERMINAL_FONT_SIZES.map((size) => (
                  <SelectItem
                    key={size}
                    value={String(size)}
                    className="text-[12px]"
                  >
                    {size} {t('px')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>
          <SettingRow
            title={t('scrollback')}
            description={t('scrollbackDescription')}
          >
            <Select
              value={String(terminalScrollback)}
              onValueChange={(v) => void setTerminalScrollback(Number(v))}
            >
              <SelectTrigger size="sm" className="h-8 w-36 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TERMINAL_SCROLLBACK_PRESETS.map((lines) => (
                  <SelectItem
                    key={lines}
                    value={String(lines)}
                    className="text-[12px]"
                  >
                    {lines.toLocaleString()} {t('lines')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>
          <SettingRow
            title={t('confirmCloseRunningTerminal')}
            description={t('confirmCloseDescriptionTerminalFull')}
          >
            <Switch
              checked={confirmCloseRunningTerminal}
              onCheckedChange={(v) => void setConfirmCloseRunningTerminal(v)}
            />
          </SettingRow>
      </div>

      <div className="flex flex-col gap-2">
        <Label>{t('agents')}</Label>
        <SettingRow
          title={t('codingAgentNotifications')}
          description={t('codingAgentNotificationsDescription')}
        >
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="xs"
              disabled={!agentNotifications || notificationTestPending}
              title={notificationTestTitle(notificationTest)}
              onClick={() => void testNotification()}
            >
              {notificationTestLabel(notificationTest)}
            </Button>
            <Switch
              checked={agentNotifications}
              disabled={notificationTestPending}
              onCheckedChange={(v) => {
                setNotificationTest("idle");
                void setAgentNotifications(v);
              }}
            />
          </div>
        </SettingRow>
        <SettingRow
          title={t('notificationSound')}
          description={t('notificationSoundDescription')}
        >
          <Switch
            checked={agentNotificationSound}
            disabled={!agentNotifications || notificationTestPending}
            onCheckedChange={(v) => void setAgentNotificationSound(v)}
          />
        </SettingRow>
      </div>

      <div className="flex flex-col gap-2">
        <Label>{t('startup')}</Label>
        <div className="flex flex-col gap-2">
          <SettingRow
            title={t('launchAtLogin')}
            description={t('launchAtLoginDescription')}
          >
            <Switch
              checked={autostart}
              onCheckedChange={(v) => void onToggleAutostart(v)}
            />
          </SettingRow>
          <SettingRow
            title={t('restoreWindowPosition')}
            description={t('restoreWindowPositionDescription')}
          >
            <Switch
              checked={restoreWindowState}
              onCheckedChange={(v) => void setRestoreWindowState(v)}
            />
          </SettingRow>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-medium tracking-tight text-muted-foreground">
      {children}
    </span>
  );
}

function notificationTestLabel(status: NotificationTestState): string {
  const { t } = useTranslation('settings.general');
  switch (status) {
    case "waiting":
      return t('switchApps');
    case "sending":
      return t('sending');
    case "requested":
      return t('requested');
    case "denied":
      return t('blocked');
    case "failed":
      return t('failed');
    case "idle":
      return t('testNotification');
    default:
      return t('testNotification');
  }
}

function notificationTestTitle(status: NotificationTestState): string {
  switch (status) {
    case "requested":
      return "Native notifications are enabled. Click to test.";
    case "denied":
      return "Native notifications are blocked. Enable them in system settings to test.";
    case "failed":
      return "Failed to send test notification. Check system notification settings.";
    default:
      return "Click to send a test notification. Switch apps to see it.";
  }
}

function FontFamilyInput({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  // Commit (and trim) only on blur/Enter so a trailing space can be typed
  // mid-edit, e.g. "JetBrains Mono ".
  const commit = () => {
    const next = draft.trim();
    if (next !== draft) setDraft(next);
    if (next !== value) onCommit(next);
  };

  return (
    <SettingRow
      title="Font family"
      description='Nerd Font name for icons (e.g. "CaskaydiaCove Nerd Font Mono"). Leave blank to auto-detect.'
    >
      <input
        type="text"
        value={draft}
        placeholder="Auto-detect"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="h-8 w-48 rounded-md border border-border bg-background px-2.5 text-[12px] outline-none focus:border-foreground/40"
      />
    </SettingRow>
  );
}
