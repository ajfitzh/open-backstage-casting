"use client";

import React, { createContext, useContext } from "react";

// 1. Create a blank context
const TenantContext = createContext<string | null>(null);

// 2. Create the Provider wrapper
export function TenantProvider({ 
  tenant, 
  children 
}: { 
  tenant: string; 
  children: React.ReactNode 
}) {
  return (
    <TenantContext.Provider value={tenant}>
      {children}
    </TenantContext.Provider>
  );
}

// 3. Create the custom Hook!
export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context; // Returns "cytfred" or "cythouston"
}