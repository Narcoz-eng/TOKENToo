import { Controller, Get, Inject, Param } from "@nestjs/common";
import { ArtGeneratorService } from "./art-generator/art-generator.service";
import { FeeEngineService } from "./fee-engine/fee-engine.service";
import { IdentityEngineService } from "./identity-engine/identity-engine.service";
import { MarketplaceEngineService } from "./marketplace/marketplace.service";
import { ProductDataService } from "./product-data/product-data.service";
import { RaidEngineService } from "./raid-engine/raid-engine.service";
import { TokenScannerService } from "./token-scanner/token-scanner.service";

@Controller()
export class AppController {
  constructor(
    @Inject(TokenScannerService) private readonly scanner: TokenScannerService,
    @Inject(IdentityEngineService) private readonly identity: IdentityEngineService,
    @Inject(ArtGeneratorService) private readonly art: ArtGeneratorService,
    @Inject(RaidEngineService) private readonly raids: RaidEngineService,
    @Inject(FeeEngineService) private readonly fees: FeeEngineService,
    @Inject(MarketplaceEngineService) private readonly marketplace: MarketplaceEngineService,
    @Inject(ProductDataService) private readonly product: ProductDataService
  ) {}

  @Get("health")
  health() {
    return { ok: true, service: "phew-run-backend" };
  }

  @Get("collections")
  collections() {
    return this.product.publicCollections();
  }

  @Get("raids")
  raidsIndex() {
    return this.product.publicRaids();
  }

  @Get("marketplace")
  marketplaceIndex() {
    return this.product.publicMarketplace();
  }

  @Get("staking")
  stakingIndex() {
    return this.product.publicStaking();
  }

  @Get("instant-sell/status")
  instantSellStatus() {
    return this.product.publicInstantSellStatus();
  }

  @Get("tokens/:mint/scan")
  scan(@Param("mint") mint: string) {
    return this.scanner.scanToken(mint);
  }

  @Get("collections/:mint/identity")
  async identityPreview(@Param("mint") mint: string) {
    const scan = await this.scanner.scanToken(mint);
    const profile = this.identity.createCommunityProfile(scan);
    const art = await this.art.generateVaultArt(profile, "preview");
    const generationPlan = this.art.createGenerationPlan(profile);
    return { scan, profile, art, generationPlan };
  }

  @Get("raids/:collectionId/preview")
  raidPreview(@Param("collectionId") collectionId: string) {
    return this.raids.createRaidRoom(collectionId, "Swamp Takeover");
  }

  @Get("fees/:grossSol/marketplace")
  feePreview(@Param("grossSol") grossSol: string) {
    return this.fees.quote(Number(grossSol), "marketplace");
  }

  @Get("marketplace/:mint/instant-sell/:backingValueSol")
  async instantSell(@Param("mint") mint: string, @Param("backingValueSol") backingValueSol: string) {
    const scan = await this.scanner.scanToken(mint);
    return this.marketplace.instantSellQuote(scan, Number(backingValueSol));
  }
}
