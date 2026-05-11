import { Controller, Get, Inject } from "@nestjs/common";
import { StudioImageProviderService } from "../generator/studio-image-provider.service";
import { CapabilitiesService } from "./capabilities.service";

@Controller("system")
export class SystemController {
  constructor(
    @Inject(CapabilitiesService) private readonly capabilities: CapabilitiesService,
    @Inject(StudioImageProviderService) private readonly studioImages: StudioImageProviderService
  ) {}

  @Get("health")
  health() {
    return this.capabilities.health();
  }

  @Get("ready")
  ready() {
    return this.capabilities.ready();
  }

  @Get("capabilities")
  status() {
    return this.capabilities.status();
  }

  @Get("image-providers")
  imageProviders() {
    return this.studioImages.imageProviderStatus();
  }

  @Get("diagnostics")
  diagnostics() {
    return this.capabilities.diagnostics();
  }
}
