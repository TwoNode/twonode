"use client";

import Script from "next/script";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

/**
 * A Cloudflare Turnstile widget for one form (explicit rendering).
 *
 * The widget hands `onToken` a token when the visitor passes, and "" when that
 * token is no longer usable (expired, errored). A token is single-use: after
 * the form has been sent, call `reset()` on the ref (whatever the outcome) to
 * get a fresh one before another attempt. The token must be checked by our own
 * server (lib/security/turnstile.ts) — never trust it in the browser.
 */

type TurnstileRenderOptions = {
  sitekey: string;
  action: string;
  theme?: "auto" | "light" | "dark";
  callback: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
  "timeout-callback"?: () => void;
};

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export type TurnstileHandle = {
  /** Ask for a fresh token (call after every submit attempt) and clear the current one. */
  reset: () => void;
};

type Props = {
  /** The widget's public site key. */
  siteKey: string;
  /** This surface's own action, e.g. "contact"; the server checks the same value. */
  action: string;
  onToken: (token: string) => void;
  className?: string;
};

export const TurnstileWidget = forwardRef<TurnstileHandle, Props>(
  function TurnstileWidget({ siteKey, action, onToken, className }, ref) {
    const container = useRef<HTMLDivElement>(null);
    const widgetId = useRef<string | null>(null);
    // Latest callback without re-rendering the widget when the parent re-renders.
    const onTokenRef = useRef(onToken);
    onTokenRef.current = onToken;

    const render = useCallback(() => {
      if (
        !container.current ||
        widgetId.current !== null ||
        !window.turnstile
      ) {
        return;
      }
      widgetId.current = window.turnstile.render(container.current, {
        sitekey: siteKey,
        action,
        theme: "auto",
        callback: (token) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(""),
        "error-callback": () => onTokenRef.current(""),
        "timeout-callback": () => onTokenRef.current(""),
      });
    }, [siteKey, action]);

    useImperativeHandle(
      ref,
      () => ({
        reset() {
          if (widgetId.current !== null) {
            window.turnstile?.reset(widgetId.current);
          }
          onTokenRef.current("");
        },
      }),
      []
    );

    // The script may already be on the page (the visitor came from another page
    // with a widget); otherwise <Script onReady> renders it once it has loaded.
    useEffect(() => {
      render();
      return () => {
        if (widgetId.current !== null) {
          window.turnstile?.remove(widgetId.current);
          widgetId.current = null;
        }
      };
    }, [render]);

    return (
      <>
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onReady={render}
        />
        <div ref={container} className={className} />
      </>
    );
  }
);
