// app/components/auditions/CallbacksClient.tsx
"use client";

import React from 'react';
import AuditionsClient, { Performer } from './AuditionsClient';

interface CallbacksClientProps {
  tenant: string;
  productionId: number;
  productionTitle: string;
  serverJudgeName: string;
  serverJudgeRole: string;
  initialPerformers: Performer[];
}

export default function CallbacksClient(props: CallbacksClientProps) {
  // We can add callback-specific headers or logic here if needed later,
  // but for now, we just pass everything to the main Audition Deck.
  return (
    <div className="h-full flex flex-col">
      <div className="bg-purple-900/20 border-b border-purple-500/30 px-6 py-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-purple-400">
          Callback Mode Active • Only showing &quot;Called Back&quot; performers
        </p>
      </div>
      <AuditionsClient {...props} />
    </div>
  );
}