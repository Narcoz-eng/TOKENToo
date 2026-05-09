import type { PreviewRenderer, RenderContext, RenderResult } from "./render-types";
import { allStudioRenderers, surrealRenderer } from "./studio-renderers";

export class PreviewRendererRegistry {
  constructor(private readonly renderers: PreviewRenderer[] = allStudioRenderers) {}

  render(ctx: RenderContext): RenderResult {
    return this.rendererFor(ctx).render(ctx);
  }

  private rendererFor(ctx: RenderContext) {
    return this.renderers.find((renderer) => renderer.families.includes(ctx.family)) ??
      this.renderers.find((renderer) => renderer.engines.includes(ctx.engine)) ??
      surrealRenderer;
  }
}
