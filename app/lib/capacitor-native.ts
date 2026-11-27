"use client";

import { Capacitor } from "@capacitor/core";

export function isNativeCapacitor(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
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
 * Launches the native MLKit barcode/QR scanner when running inside the iOS/Android
 * Capacitor shell. Returns the scanned raw value, or null if cancelled / unavailable.
 */
export async function scanBarcodeNative(): Promise<string | null> {
  if (!isNativeCapacitor()) return null;
  try {
    const { BarcodeScanner } = await import("@capacitor-mlkit/barcode-scanning");
    const { supported } = await BarcodeScanner.isSupported();
    if (!supported) return null;

    const perms = await BarcodeScanner.requestPermissions();
    if (perms.camera !== "granted" && perms.camera !== "limited") {
      return null;
    }

    const result = await BarcodeScanner.scan();
    const first = result.barcodes?.[0]?.rawValue || result.barcodes?.[0]?.displayValue;
    if (first) {
      await triggerHaptic("success");
      return first;
    }
    return null;
  } catch {
    return null;
  }
}
