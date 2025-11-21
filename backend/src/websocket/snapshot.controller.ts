import { Controller, Get, Query } from '@nestjs/common';
import { GenerationSnapshotService } from './snapshot.service';

@Controller('ws')
export class SnapshotController {
  constructor(private readonly snapshotService: GenerationSnapshotService) {}

  // GET /ws/snapshot?event=module:generation&id=123
  @Get('snapshot')
  getSnapshot(@Query('event') event: string, @Query('id') id: string) {
    if (!event || !id) {
      return { success: false, message: 'event and id query params are required' };
    }

    const channel = GenerationSnapshotService.channelFor(event, id);
    const snapshot = this.snapshotService.get(channel);

    return { success: true, channel, snapshot };
  }
}
