import { Controller, Get, Inject, Param } from "@nestjs/common";
import { ProtocolService } from "./protocol.service";

@Controller()
export class ProtocolController {
  constructor(@Inject(ProtocolService) private readonly protocol: ProtocolService) {}

  @Get("protocol/health")
  health() {
    return this.protocol.health();
  }

  @Get("protocol/reserves")
  reserves() {
    return this.protocol.reserves();
  }

  @Get("collections/:id/reserve")
  collectionReserve(@Param("id") id: string) {
    return this.protocol.collectionReserve(id);
  }

  @Get("collections/:id/vaults")
  collectionVaults(@Param("id") id: string) {
    return this.protocol.collectionVaults(id);
  }

  @Get("vaults/:mint/proof")
  vaultProof(@Param("mint") mint: string) {
    return this.protocol.vaultProof(mint);
  }

  @Get("vaults/:mint/redeemability")
  redeemability(@Param("mint") mint: string) {
    return this.protocol.redeemability(mint);
  }

  @Get("vaults/:mint/owner")
  owner(@Param("mint") mint: string) {
    return this.protocol.owner(mint);
  }

  @Get("vaults/:mint/history")
  history(@Param("mint") mint: string) {
    return this.protocol.history(mint);
  }
}
