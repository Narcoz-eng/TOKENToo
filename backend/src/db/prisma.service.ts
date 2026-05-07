import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { runtimeDatabaseUrl } from "./database-url";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const connectionString = runtimeDatabaseUrl();
    const adapter = connectionString ? new PrismaPg({ connectionString }) : undefined;
    super(adapter ? { adapter } : undefined);
  }

  async onModuleInit() {}

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
