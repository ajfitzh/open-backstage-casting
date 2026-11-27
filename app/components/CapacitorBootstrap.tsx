"use client";

import { useEffect } from "react";
import { initNativeStatusBar } from "@/app/lib/capacitor-native";

export default function CapacitorBootstrap() {
  useEffect(() => {
    void initNativeStatusBar();
  }, []);

  return null;
}
