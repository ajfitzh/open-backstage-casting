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
