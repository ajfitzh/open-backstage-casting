"use client";

import { useEffect } from "react";
import {
  initNativeStatusBar,
  registerNativeDeepLinkAuthListener,
} from "@/app/lib/capacitor-native";

export default function CapacitorBootstrap() {
  useEffect(() => {
    void initNativeStatusBar();
    let cleanup: (() => void) | undefined;
    void registerNativeDeepLinkAuthListener().then((fn) => {
      cleanup = fn;
    });
    return () => {
      cleanup?.();
    };
  }, []);

  return null;
}
