import { Injectable } from '@nestjs/common';

export type ChannelKey = string; // e.g. 'course:generation:123'

@Injectable()
export class GenerationSnapshotService {
  private snapshots: Record<ChannelKey, unknown> = {};

  set(channel: ChannelKey, payload: unknown) {
    // merge with existing snapshot to preserve fields like lastError
    const existing = (this.snapshots[channel] as Record<string, unknown>) || {};
    if (payload && typeof payload === 'object') {
      this.snapshots[channel] = { ...existing, ...(payload as Record<string, unknown>) };
    } else {
      this.snapshots[channel] = payload;
    }
  }

  get(channel: ChannelKey) {
    return this.snapshots[channel] ?? null;
  }

  delete(channel: ChannelKey) {
    delete this.snapshots[channel];
  }

  // helper to build channel key from parts
  static channelFor(event: string, id: string) {
    return `${event}:${id}`;
  }
}
