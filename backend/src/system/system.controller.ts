import { Controller, Get, Inject } from "@nestjs/common";
import { CapabilitiesService } from "./capabilities.service";

@Controller("system")
export class SystemController {
  constructor(@Inject(CapabilitiesService) private readonly capabilities: CapabilitiesService) {}

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

  @Get("diagnostics")
  diagnostics() {
    return this.capabilities.diagnostics();
  }
}
