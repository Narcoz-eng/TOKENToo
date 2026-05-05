import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import type { ApproveGenerationRunInput, CreateGenerationRunInput, LaunchCollectionInput } from "./generator.types";
import { GeneratorService } from "./generator.service";

@Controller("generator")
export class GeneratorController {
  constructor(private readonly generator: GeneratorService) {}

  @Get("presets")
  presets() {
    return this.generator.presets();
  }

  @Post("runs")
  createRun(@Body() body: CreateGenerationRunInput) {
    return this.generator.createRun(body);
  }

  @Get("runs/:id")
  getRun(@Param("id") id: string) {
    return this.generator.getRun(id);
  }

  @Post("runs/:id/regenerate-style")
  regenerateStyle(@Param("id") id: string) {
    return this.generator.regenerateStyle(id);
  }

  @Post("runs/:id/regenerate-previews")
  regeneratePreviews(@Param("id") id: string) {
    return this.generator.regeneratePreviews(id);
  }

  @Post("runs/:id/approve")
  approve(@Param("id") id: string, @Body() body: ApproveGenerationRunInput) {
    return this.generator.approve(id, body);
  }

  @Post("runs/:id/launch-collection")
  launchCollection(@Param("id") id: string, @Body() body: LaunchCollectionInput) {
    return this.generator.launchCollection(id, body);
  }

  @Post("runs/:id/sample-metadata")
  sampleMetadata(@Param("id") id: string) {
    return this.generator.sampleMetadata(id);
  }
}
