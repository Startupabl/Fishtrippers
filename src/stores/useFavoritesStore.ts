import { create } from "zustand";
import { listMyFavoriteIds, addFavorite, removeFavorite } from "@/lib/favorites.functions";

interface FavoritesState {
  ids: Set<string>;
  hydrated: boolean;
  hydrating: boolean;
  hydrate: () => Promise<void>;
  reset: () => void;
  isFavorite: (journeyId: string) => boolean;
  toggle: (journeyId: string) => Promise<boolean>; // returns new state (true=favorited)
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  ids: new Set<string>(),
  hydrated: false,
  hydrating: false,
  async hydrate() {
    if (get().hydrated || get().hydrating) return;
    set({ hydrating: true });
    try {
      const ids = await listMyFavoriteIds();
      set({ ids: new Set(ids), hydrated: true, hydrating: false });
    } catch (e) {
      console.error("[favorites] hydrate failed", e);
      set({ hydrating: false });
    }
  },
  reset() {
    set({ ids: new Set<string>(), hydrated: false, hydrating: false });
  },
  isFavorite(journeyId) {
    return get().ids.has(journeyId);
  },
  async toggle(journeyId) {
    const current = new Set(get().ids);
    const wasFav = current.has(journeyId);
    // Optimistic update
    if (wasFav) current.delete(journeyId);
    else current.add(journeyId);
    set({ ids: current });
    try {
      if (wasFav) {
        await removeFavorite({ data: { journey_id: journeyId } });
      } else {
        await addFavorite({ data: { journey_id: journeyId } });
      }
      return !wasFav;
    } catch (e) {
      console.error("[favorites] toggle failed", e);
      // Roll back
      const rb = new Set(get().ids);
      if (wasFav) rb.add(journeyId);
      else rb.delete(journeyId);
      set({ ids: rb });
      throw e;
    }
  },
}));
