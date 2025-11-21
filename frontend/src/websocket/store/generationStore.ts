import create from 'zustand';

export type ChannelKey = string; // e.g., 'course:generation:123' or 'module:generation:456'

export interface GenerationState {
  channels: Record<ChannelKey, unknown>;
  setChannel: (channel: ChannelKey, payload: unknown) => void;
  removeChannel: (channel: ChannelKey) => void;
  getSnapshot: () => Record<ChannelKey, unknown>;
}

export const useGenerationStore = create<GenerationState>((set, get) => ({
  channels: {},
  setChannel: (channel, payload) => set(s => ({ channels: { ...s.channels, [channel]: payload } })),
  removeChannel: channel =>
    set(s => {
      const next = { ...s.channels };
      delete next[channel];
      return { channels: next };
    }),
  getSnapshot: () => get().channels,
}));

export default useGenerationStore;
