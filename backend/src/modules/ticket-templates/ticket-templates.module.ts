import { Module } from '@nestjs/common';
import { TicketTemplatesService } from './ticket-templates.service';
import { TicketTemplatesController } from './ticket-templates.controller';

@Module({
  controllers: [TicketTemplatesController],
  providers: [TicketTemplatesService],
})
export class TicketTemplatesModule {}
