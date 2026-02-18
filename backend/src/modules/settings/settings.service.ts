import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}
  async getAll() {
    const settings = await this.prisma.systemSetting.findMany();
    return Object.fromEntries(settings.map(s => [s.key, s.value]));
  }
  async get(key: string) {
    const s = await this.prisma.systemSetting.findUnique({ where: { key } });
    return s?.value;
  }
  async set(key: string, value: any) {
    return this.prisma.systemSetting.upsert({
      where: { key }, update: { value }, create: { key, value },
    });
  }
  async setMany(settings: Record<string, any>) {
    const ops = Object.entries(settings).map(([key, value]) =>
      this.prisma.systemSetting.upsert({ where: { key }, update: { value }, create: { key, value } })
    );
    return this.prisma.$transaction(ops);
  }
}
