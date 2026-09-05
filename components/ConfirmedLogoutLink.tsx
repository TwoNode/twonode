"use client";

import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type ConfirmedLogoutLinkProps = {
  /** The fully-styled clickable element (icon button, "Sign Out" button,
   * etc.) — passed through to AlertDialogTrigger's asChild, so it renders
   * exactly as before and only gains a confirmation step in front of it. */
  trigger: React.ReactElement;
} & (
  | { postLogoutRedirectURL: string; onConfirm?: never }
  | {
      /** For the one native-auth logout site that doesn't go through
       * Kinde's LogoutLink (a plain fetch + router.push instead). */
      onConfirm: () => void;
      postLogoutRedirectURL?: never;
    }
);

/**
 * Every logout button in the app (Surfboard, REVA, GBC — admin and user)
 * fired immediately on click, with no confirmation — most via Kinde's
 * LogoutLink, one via a plain fetch+redirect. This wraps whichever one in
 * a shared AlertDialog (the pattern already used for delete confirmations,
 * e.g. DeleteAdminModal) so a misclick doesn't silently sign someone out
 * mid-task.
 */
export function ConfirmedLogoutLink({ trigger, ...action }: ConfirmedLogoutLinkProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Log out?</AlertDialogTitle>
          <AlertDialogDescription>You&apos;ll need to sign in again to continue.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {action.onConfirm ? (
            <AlertDialogAction onClick={action.onConfirm}>Log out</AlertDialogAction>
          ) : (
            <AlertDialogAction asChild>
              <LogoutLink postLogoutRedirectURL={action.postLogoutRedirectURL}>Log out</LogoutLink>
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
