import type { CloseManyPending } from "@/app/hooks/tabCloseGuards";
import {
  type AppCloseBlocker,
  canOptOutOfAppClosePrompt,
} from "@/app/hooks/useAppCloseGuard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { setConfirmCloseRunningTerminal } from "@/modules/settings/store";
import type { Tab } from "@/modules/tabs";
import { useId, useState } from "react";
import { useTranslation } from "@/i18n";

type Props = {
  tabs: Tab[];
  pendingCloseTab: number | null;
  onCancelClose: () => void;
  onConfirmClose: () => void;
  pendingTerminalCloseTab: number | null;
  onCancelTerminalClose: () => void;
  onConfirmTerminalClose: () => void;
  pendingDeleteTabs: number[] | null;
  onCancelDeleteClose: () => void;
  onConfirmDeleteClose: () => void;
  pendingCloseMany: CloseManyPending | null;
  closeManyConfirming: boolean;
  onCancelCloseMany: () => void;
  onConfirmCloseMany: () => void;
  pendingAppClose: AppCloseBlocker | null;
  onCancelAppClose: () => void;
  onConfirmAppClose: () => void;
};

function appCloseMessage(blocker: AppCloseBlocker): string {
  const dirty =
    blocker.dirtyEditors === 1
      ? "1 file has unsaved changes"
      : `${blocker.dirtyEditors} files have unsaved changes`;
  if (blocker.dirtyEditors > 0 && blocker.busyTerminal) {
    return `A process is still running and ${dirty}. Quitting will terminate it and discard the changes.`;
  }
  if (blocker.dirtyEditors > 0) {
    return `${dirty.charAt(0).toUpperCase()}${dirty.slice(1)}. Quitting will discard them.`;
  }
  return "A process is still running in a terminal. Quitting will terminate it.";
}

function OptOutRow({
  checked,
  onCheckedChange,
  namespace = 'dialogs.closeTerminal',
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  namespace?: string;
}) {
  const { t } = useTranslation(namespace);
  const id = useId();
  return (
    <div className="-mt-3 flex items-center justify-center gap-2 sm:justify-start">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      <Label
        htmlFor={id}
        className="font-normal text-[12px] text-muted-foreground"
      >
        {t('optOut')}
      </Label>
    </div>
  );
}

async function persistOptOut(): Promise<void> {
  try {
    await setConfirmCloseRunningTerminal(false);
  } catch (e) {
    console.error("close-confirmation opt-out failed", e);
  }
}

function closeManyMessage(pending: CloseManyPending, tabs: Tab[]): string {
  const { kind, dirtyIds, busyLeafIds } = pending;
  const dirtyCount = dirtyIds.length;
  const busyCount = busyLeafIds.length;
  if (dirtyCount === 1 && busyCount === 0) {
    const dirty = tabs.find(
      (tab) => tab.kind === "editor" && dirtyIds.includes(tab.id),
    );
    return dirty?.title
      ? `"${dirty.title}" has unsaved changes. Close it anyway?`
      : "1 tab has unsaved changes. Close it anyway?";
  }
  if (dirtyCount > 0 && busyCount > 0) {
    const dirty = `${dirtyCount} tab${dirtyCount === 1 ? " has" : "s have"} unsaved changes`;
    const busy =
      busyCount === 1
        ? "a process is running"
        : `${busyCount} processes are running`;
    return `${dirty} and ${busy}. Closing will discard the changes and terminate the ${busyCount === 1 ? "process" : "processes"}. Close anyway?`;
  }
  if (dirtyCount > 0) {
    return `${dirtyCount} tabs have unsaved changes. Closing will discard them. Close anyway?`;
  }
  const process =
    busyCount === 1 ? "A process is" : `${busyCount} processes are`;
  return kind === "right"
    ? `${process} running in ${busyCount === 1 ? "a tab" : "tabs"} to the right. Closing will terminate ${busyCount === 1 ? "it" : "them"}. Close anyway?`
    : `${process} running in ${busyCount === 1 ? "another tab" : "other tabs"}. Closing will terminate ${busyCount === 1 ? "it" : "them"}. Close anyway?`;
}

/** Confirmation dialogs for closing dirty editors and terminals with live processes. */
export function CloseDialogs({
  tabs,
  pendingCloseTab,
  onCancelClose,
  onConfirmClose,
  pendingTerminalCloseTab,
  onCancelTerminalClose,
  onConfirmTerminalClose,
  pendingDeleteTabs,
  onCancelDeleteClose,
  onConfirmDeleteClose,
  pendingCloseMany,
  closeManyConfirming,
  onCancelCloseMany,
  onConfirmCloseMany,
  pendingAppClose,
  onCancelAppClose,
  onConfirmAppClose,
}: Props) {
  const { t } = useTranslation('dialogs');
  const [optOutTerminalClose, setOptOutTerminalClose] = useState(false);
  const [optOutAppClose, setOptOutAppClose] = useState(false);
  const appCloseCanOptOut =
    pendingAppClose !== null && canOptOutOfAppClosePrompt(pendingAppClose);

  const confirmTerminalClose = () => {
    if (optOutTerminalClose) void persistOptOut();
    setOptOutTerminalClose(false);
    onConfirmTerminalClose();
  };

  const cancelTerminalClose = () => {
    setOptOutTerminalClose(false);
    onCancelTerminalClose();
  };

  // The pref write has to land before the window closes, or quitting drops it.
  const confirmAppClose = async () => {
    const optOut = appCloseCanOptOut && optOutAppClose;
    setOptOutAppClose(false);
    if (optOut) await persistOptOut();
    onConfirmAppClose();
  };

  const cancelAppClose = () => {
    setOptOutAppClose(false);
    onCancelAppClose();
  };

  return (
    <>
      <AlertDialog
        open={pendingCloseTab !== null}
        onOpenChange={(open) => !open && onCancelClose()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('closeTab.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {tabs.find((t) => t.id === pendingCloseTab)?.title
                ? `"${
                    tabs.find((t) => t.id === pendingCloseTab)?.title
                  }" ${t('closeTab.message')}`
                : t('closeTab.message')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onCancelClose}>
              {t('closeTab.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmClose}>
              {t('closeTab.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingTerminalCloseTab !== null}
        onOpenChange={(open) => !open && cancelTerminalClose()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('closeTerminal.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('closeTerminal.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <OptOutRow
            checked={optOutTerminalClose}
            onCheckedChange={setOptOutTerminalClose}
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelTerminalClose}>
              {t('closeTerminal.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmTerminalClose}>
              {t('closeTerminal.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingDeleteTabs !== null}
        onOpenChange={(open) => !open && onCancelDeleteClose()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('closeTab.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteTabs?.length === 1
                ? (() => {
                    const title = tabs.find(
                      (t) => t.id === pendingDeleteTabs[0],
                    )?.title;
                    return title
                      ? `"${title}" ${t('closeTab.deletedMessage')}`
                      : t('closeTab.deletedMessage');
                  })()
                : `${pendingDeleteTabs?.length ?? 0} ${t('closeTab.message', { count: pendingDeleteTabs?.length ?? 0 })}. ${t('common.actions.close')}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onCancelDeleteClose}>
              {t('closeTab.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmDeleteClose}>
              {t('closeTab.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingCloseMany !== null}
        onOpenChange={(open) => !open && onCancelCloseMany()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingCloseMany?.kind === "right"
                ? t('closeMultiple.titleRight')
                : t('closeMultiple.titleOther')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCloseMany ? closeManyMessage(pendingCloseMany, tabs) : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onCancelCloseMany}>
              {t('closeMultiple.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={closeManyConfirming}
              onClick={(event) => {
                event.preventDefault();
                onConfirmCloseMany();
              }}
            >
              {closeManyConfirming ? t('closeMultiple.confirmChecking') : t('closeMultiple.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingAppClose !== null}
        onOpenChange={(open) => !open && cancelAppClose()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('closeWindow.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAppClose ? appCloseMessage(pendingAppClose) : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {appCloseCanOptOut ? (
            <OptOutRow
              checked={optOutAppClose}
              onCheckedChange={setOptOutAppClose}
              namespace="dialogs.closeWindow"
            />
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelAppClose}>
              {t('closeWindow.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmAppClose()}>
              {t('closeWindow.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
