import { Module } from "@nestjs/common";
import { PrismaService } from "../db/prisma.service";
import { ProductDataController } from "./product-data.controller";
import { ProductDataService } from "./product-data.service";

@Module({
  controllers: [ProductDataController],
  providers: [PrismaService, ProductDataService],
  exports: [ProductDataService]
})
export class ProductDataModule {}
