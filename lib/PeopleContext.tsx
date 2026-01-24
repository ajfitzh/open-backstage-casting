"use client";
import React, { createContext, useContext, useMemo } from 'react';
import { Performer } from './types';

interface PeopleContextType {
  people: Performer[];
  getName: (id: number) => string;
}

const PeopleContext = createContext<PeopleContextType | undefined>(undefined);

export function PeopleProvider({
  children,
  people,
}: {
  children: React.ReactNode;
  people: Performer[];
}) {
  // Create a map for faster lookups (O(1) access)
  const peopleMap = useMemo(() => {
    const map = new Map<number, Performer>();
    people.forEach((p) => map.set(p.id, p));
    return map;
  }, [people]);

  const getName = (id: number) => {
    return peopleMap.get(id)?.name ?? 'Unknown';
  };

  return (
    <PeopleContext.Provider value={{ people, getName }}>
      {children}
    </PeopleContext.Provider>
  );
}

export function usePeople() {
  const context = useContext(PeopleContext);
  if (context === undefined) {
    throw new Error('usePeople must be used within a PeopleProvider');
  }
  return context;
}