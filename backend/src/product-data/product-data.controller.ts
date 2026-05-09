import { Controller, Get, Inject, Param, Query } from "@nestjs/common";
import { ProductDataService } from "./product-data.service";

@Controller("product")
export class ProductDataController {
  constructor(@Inject(ProductDataService) private readonly product: ProductDataService) {}

  @Get("home")
  home() {
    return this.product.publicHome();
  }

  @Get("collections")
  collections() {
    return this.product.publicCollections();
  }

  @Get("collections/:id")
  collection(@Param("id") id: string) {
    return this.product.publicCollection(id);
  }

  @Get("collections/:id/community")
  community(@Param("id") id: string) {
    return this.product.publicCommunity(id);
  }

  @Get("collections/:id/raids")
  collectionRaids(@Param("id") id: string) {
    return this.product.publicCollectionRaids(id);
  }

  @Get("collections/:id/raids/:raidId")
  raidRoom(@Param("id") id: string, @Param("raidId") raidId: string) {
    return this.product.publicRaidRoom(id, raidId);
  }

  @Get("raids")
  raids() {
    return this.product.publicRaids();
  }

  @Get("marketplace")
  marketplace() {
    return this.product.publicMarketplace();
  }

  @Get("staking")
  staking(@Query("wallet") walletAddress?: string) {
    return this.product.publicStaking(walletAddress);
  }

  @Get("profile")
  profile(@Query("wallet") walletAddress?: string) {
    return this.product.publicProfile(walletAddress);
  }

  @Get("nfts")
  nfts() {
    return this.product.publicVaultNfts();
  }

  @Get("nfts/:id")
  nft(@Param("id") id: string) {
    return this.product.publicNft(id);
  }

  @Get("instant-sell")
  instantSell(@Query("wallet") walletAddress?: string) {
    return this.product.publicInstantSell(walletAddress);
  }

  @Get("instant-sell/status")
  instantSellStatus() {
    return this.product.publicInstantSellStatus();
  }

  @Get("admin/risk")
  adminRisk() {
    return this.product.publicAdminRisk();
  }
}
