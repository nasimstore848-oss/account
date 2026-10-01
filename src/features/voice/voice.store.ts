'use client';

import { create } from 'zustand';
import { VoiceDraft } from '@/adapters/voice/parse-command';

export type VoiceStatus =
  | 'idle'
  | 'listening'
  | 'parsing'
  | 'resolvingPayee'
  | 'choosePayee'
  | 'confirmCreate'
  | 'review'
  | 'error';

export type VoiceCandidate = {
  id: string;
  nameAr: string;
  code: string;
};

export interface VoiceState {
  isOpen: boolean;
  status: VoiceStatus;
  transcript: string;
  error: string | null;
  draft: (VoiceDraft & { payeeId?: string }) | null;
  candidates: VoiceCandidate[];
  set: (partial: Partial<VoiceState>) => void;
  openModal: () => void;
  closeModal: () => void;
  reset: () => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  isOpen: false,
  status: 'idle',
  transcript: '',
  error: null,
  draft: null,
  candidates: [],
  set: (partial) => set(partial),
  openModal: () => set({ isOpen: true, status: 'idle', error: null, transcript: '', draft: null }),
  closeModal: () => set({ isOpen: false, status: 'idle', error: null }),
  reset: () => set({ status: 'idle', transcript: '', error: null, draft: null, candidates: [] }),
}));
