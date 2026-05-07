import { Controller, Get } from "@nestjs/common";
import { CapabilitiesService } from "./capabilities.service";

@Controller("system")
export class SystemController {
  constructor(private readonly capabilities: CapabilitiesService) {}

  @Get("capabilities")
  status() {
    return this.capabilities.status();
  }
}
