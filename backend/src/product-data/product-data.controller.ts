import { Controller, Get, Param, Query } from "@nestjs/common";
import { ProductDataService } from "./product-data.service";

@Controller("product")
export class ProductDataController {
  constructor(private readonly product: ProductDataService) {}

  @Get("home")
  home() {
    return this.product.home();
  }

  @Get("collections")
  collections() {
    return this.product.collections();
  }

  @Get("collections/:id")
  collection(@Param("id") id: string) {
    return this.product.collection(id);
  }

  @Get("collections/:id/community")
  community(@Param("id") id: string) {
    return this.product.community(id);
  }

  @Get("collections/:id/raids")
  collectionRaids(@Param("id") id: string) {
    return this.product.raids(id);
  }

  @Get("collections/:id/raids/:raidId")
  raidRoom(@Param("id") id: string, @Param("raidId") raidId: string) {
    return this.product.raidRoom(id, raidId);
  }

  @Get("raids")
  raids() {
    return this.product.raids();
  }

  @Get("marketplace")
  marketplace() {
    return this.product.marketplace();
  }

  @Get("staking")
  staking(@Query("wallet") walletAddress?: string) {
    return this.product.staking(walletAddress);
  }

  @Get("profile")
  profile(@Query("wallet") walletAddress?: string) {
    return this.product.profile(walletAddress);
  }

  @Get("nfts")
  nfts() {
    return this.product.vaultNfts();
  }

  @Get("nfts/:id")
  nft(@Param("id") id: string) {
    return this.product.nft(id);
  }

  @Get("instant-sell")
  instantSell(@Query("wallet") walletAddress?: string) {
    return this.product.instantSell(walletAddress);
  }

  @Get("admin/risk")
  adminRisk() {
    return this.product.adminRisk();
  }
}
