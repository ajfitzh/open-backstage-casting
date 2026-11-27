"use client";

import { useSyncExternalStore } from "react";
import { Capacitor } from "@capacitor/core";

export function isNativeCapacitor(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

const noopSubscribe = () => () => {};

export function useIsNativeCapacitor(): boolean {
  return useSyncExternalStore(noopSubscribe, isNativeCapacitor, () => false);
}

export async function initNativeStatusBar(): Promise<void> {
  if (!isNativeCapacitor()) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark });
    if (Capacitor.getPlatform() === "android") {
      await StatusBar.setBackgroundColor({ color: "#09090b" });
    }
  } catch {
    // Ignore when running outside native shell
  }
}

export async function triggerHaptic(
  kind: "light" | "medium" | "success" | "error" = "light"
): Promise<void> {
  if (!isNativeCapacitor()) return;
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import("@capacitor/haptics");
    if (kind === "success") {
      await Haptics.notification({ type: NotificationType.Success });
    } else if (kind === "error") {
      await Haptics.notification({ type: NotificationType.Error });
    } else {
      await Haptics.impact({
        style: kind === "medium" ? ImpactStyle.Medium : ImpactStyle.Light,
      });
    }
  } catch {
    // Ignore when haptics are unavailable
  }
}

/**
 * Opens Google OAuth inside Apple's in-app SFSafariViewController so Google allows
 * OAuth (unlike embedded WKWebView) and shares iOS Safari's saved Google session.
 * When OAuth completes, /api/auth/mobile-complete bounces back via `openbackstage://auth/callback`.
 */
export async function startNativeGoogleSignIn(
  tenant?: string,
  onSheetClosed?: () => void
): Promise<void> {
  if (!isNativeCapacitor()) return;
  const { Browser } = await import("@capacitor/browser");

  const origin = window.location.origin;
  const url = tenant
    ? `${origin}/api/auth/mobile-google?tenant=${encodeURIComponent(tenant)}`
    : `${origin}/api/auth/mobile-google`;

  let listenerHandle: { remove: () => Promise<void> } | null = null;
  if (onSheetClosed) {
    listenerHandle = await Browser.addListener("browserFinished", () => {
      onSheetClosed();
      void listenerHandle?.remove();
    });
  }

  await Browser.open({
    url,
    presentationStyle: "popover",
    toolbarColor: "#09090b",
  });
}

/**
 * Listens for `openbackstage://auth/callback?...` deep links returning from
 * SFSafariViewController, dismisses the sheet, and completes the NextAuth session
 * inside the app's WKWebView via /api/auth/handoff.
 */
export async function registerNativeDeepLinkAuthListener(): Promise<() => void> {
  if (!isNativeCapacitor()) return () => {};

  const { App } = await import("@capacitor/app");
  const { Browser } = await import("@capacitor/browser");

  const handle = await App.addListener("appUrlOpen", async ({ url }) => {
    if (!url || !url.startsWith("openbackstage://auth/callback")) return;

    try {
      await Browser.close();
    } catch {
      // Sheet may already be dismissed
    }

    try {
      const parsed = new URL(url);
      const token = parsed.searchParams.get("token");
      const tenant = parsed.searchParams.get("tenant");
      const error = parsed.searchParams.get("error");

      if (error || !token) {
        window.location.href = `/login?error=${encodeURIComponent(error || "GoogleAuthFailed")}`;
        return;
      }

      const currentHost = window.location.host;
      let targetOrigin = window.location.origin;

      if (tenant && !currentHost.startsWith(`${tenant}.`)) {
        if (currentHost.includes("open-backstage.org")) {
          targetOrigin = `https://${tenant}.open-backstage.org`;
        } else if (currentHost.includes("localhost")) {
          const port = window.location.port ? `:${window.location.port}` : "";
          targetOrigin = `${window.location.protocol}//${tenant}.localhost${port}`;
        }
      }

      window.location.href = `${targetOrigin}/api/auth/handoff?token=${encodeURIComponent(token)}`;
    } catch (err) {
      console.error("[Capacitor] Deep-link auth callback error:", err);
    }
  });

  return () => {
    void handle.remove();
  };
}

/**
 * Launches the native iOS/Android barcode/QR scanner when running inside the
 * Capacitor shell. Returns the scanned raw value, or null if cancelled / unavailable.
 */
export async function scanBarcodeNative(): Promise<string | null> {
  if (!isNativeCapacitor()) return null;
  try {
    const { CapacitorBarcodeScanner, CapacitorBarcodeScannerTypeHint } = await import(
      "@capacitor/barcode-scanner"
    );
    const result = await CapacitorBarcodeScanner.scanBarcode({
      hint: CapacitorBarcodeScannerTypeHint.ALL,
      scanInstructions: "Align QR code or barcode inside the frame",
    });
    if (result?.ScanResult) {
      await triggerHaptic("success");
      return result.ScanResult;
    }
    return null;
  } catch {
    return null;
  }
}
