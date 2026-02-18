import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async getNextTicketNumber(): Promise<string> {
    const prefix = process.env.TICKET_PREFIX || 'LOOP';
    const result = await this.$transaction(async (tx) => {
      const counter = await tx.ticketCounter.upsert({
        where: { id: 'singleton' },
        update: { counter: { increment: 1 } },
        create: { id: 'singleton', counter: 1 },
      });
      return counter.counter;
    });
    return `${prefix}-${String(result).padStart(6, '0')}`;
  }
}
