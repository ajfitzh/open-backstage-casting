"use client";

import React, { createContext, useContext, useState } from 'react';

interface SimulationContextType {
  // The "Effective" roles (Simulated if active, otherwise Real)
  role: string;
  productionRole: string | null;
  
  // Controls
  isSimulating: boolean;
  simulate: (global: string | null, prod: string | null) => void;
  reset: () => void;
}

const SimulationContext = createContext<SimulationContextType | null>(null);

export function SimulationProvider({ 
  children, 
  realGlobalRole, 
  realProductionRole 
}: { 
  children: React.ReactNode, 
  realGlobalRole: string, 
  realProductionRole: string | null 
}) {
  const [simGlobal, setSimGlobal] = useState<string | null>(null);
  const [simProd, setSimProd] = useState<string | null>(null);

  // LOGIC: Use Sim if it exists, otherwise use Real
  const effectiveGlobal = simGlobal || realGlobalRole;
  const effectiveProd = simProd !== null ? simProd : realProductionRole;

  const simulate = (global: string | null, prod: string | null) => {
    setSimGlobal(global);
    setSimProd(prod);
  };

  const reset = () => {
    setSimGlobal(null);
    setSimProd(null);
  };

  return (
    <SimulationContext.Provider value={{
      role: effectiveGlobal,
      productionRole: effectiveProd,
      isSimulating: !!(simGlobal || simProd),
      simulate,
      reset
    }}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const context = useContext(SimulationContext);
  if (!context) throw new Error("useSimulation must be used within a SimulationProvider");
  return context;
}