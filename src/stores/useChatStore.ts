// Persisted minimal chat store with text + custom-offer messages.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ChatAuthor = "mentor" | "learner";
export type OfferStatus = "pending" | "accepted" | "declined";

export interface CustomOffer {
  description: string;
  sessions: number;
  priceMinor: number;
  currency: string;
}

export type ChatMessage =
  | {
      id: string;
      kind: "text";
      author: ChatAuthor;
      body: string;
      createdAtIso: string;
    }
  | {
      id: string;
      kind: "offer";
      author: ChatAuthor;
      offer: CustomOffer;
      status: OfferStatus;
      createdAtIso: string;
    };

export interface ChatThreadMeta {
  mentorName: string;
  mentorAvatarUrl?: string;
  pathTitle?: string;
}

export interface ChatThread {
  meta: ChatThreadMeta;
  messages: ChatMessage[];
}

interface ChatState {
  threads: Record<string, ChatThread>;
  ensureThread: (id: string, meta: ChatThreadMeta) => void;
  appendText: (id: string, author: ChatAuthor, body: string) => void;
  appendOffer: (id: string, author: ChatAuthor, offer: CustomOffer) => string;
  setOfferStatus: (id: string, messageId: string, status: OfferStatus) => void;
}

function uuid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const noopStorage: Storage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  length: 0,
  clear: () => {},
  key: () => null,
};

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      threads: {},
      ensureThread: (id, meta) =>
        set((s) => {
          if (s.threads[id]) return s;
          return {
            threads: {
              ...s.threads,
              [id]: { meta, messages: [] },
            },
          };
        }),
      appendText: (id, author, body) =>
        set((s) => {
          const t = s.threads[id];
          if (!t) return s;
          const msg: ChatMessage = {
            id: uuid(),
            kind: "text",
            author,
            body,
            createdAtIso: new Date().toISOString(),
          };
          return {
            threads: {
              ...s.threads,
              [id]: { ...t, messages: [...t.messages, msg] },
            },
          };
        }),
      appendOffer: (id, author, offer) => {
        const msgId = uuid();
        set((s) => {
          const t = s.threads[id];
          if (!t) return s;
          const msg: ChatMessage = {
            id: msgId,
            kind: "offer",
            author,
            offer,
            status: "pending",
            createdAtIso: new Date().toISOString(),
          };
          return {
            threads: {
              ...s.threads,
              [id]: { ...t, messages: [...t.messages, msg] },
            },
          };
        });
        return msgId;
      },
      setOfferStatus: (id, messageId, status) =>
        set((s) => {
          const t = s.threads[id];
          if (!t) return s;
          return {
            threads: {
              ...s.threads,
              [id]: {
                ...t,
                messages: t.messages.map((m) =>
                  m.id === messageId && m.kind === "offer" ? { ...m, status } : m,
                ),
              },
            },
          };
        }),
    }),
    {
      name: "aimentor-chat",
      version: 1,
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : noopStorage,
      ),
    },
  ),
);
