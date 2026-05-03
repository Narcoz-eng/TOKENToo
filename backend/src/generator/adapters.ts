export interface DesignModelAdapter {
  generateBaseMascots(prompt: string): Promise<string[]>;
  generateBackgrounds(prompt: string): Promise<string[]>;
}

export interface LayerPackAdapter {
  loadPremiumLayerPack(stylePreset: string): Promise<string[]>;
}

export interface AnimationAssetAdapter {
  createLegendaryAnimation(prompt: string): Promise<string>;
}

export interface AssetStorageAdapter {
  uploadAsset(path: string, content: string): Promise<string>;
  uploadMetadata(metadata: Record<string, unknown>): Promise<string>;
}

export class MockDesignModelAdapter implements DesignModelAdapter {
  async generateBaseMascots(prompt: string) {
    return [`mock-ai-base:${prompt.slice(0, 64)}`];
  }

  async generateBackgrounds(prompt: string) {
    return [`mock-ai-background:${prompt.slice(0, 64)}`];
  }
}

export class MockLayerPackAdapter implements LayerPackAdapter {
  async loadPremiumLayerPack(stylePreset: string) {
    return [`mock-layer-pack:${stylePreset}`];
  }
}

export class MockAnimationAssetAdapter implements AnimationAssetAdapter {
  async createLegendaryAnimation(prompt: string) {
    return `mock-animation:${prompt.slice(0, 64)}`;
  }
}

export class MockAssetStorageAdapter implements AssetStorageAdapter {
  async uploadAsset(path: string) {
    return `ipfs://vaultx/mock-assets/${path}`;
  }

  async uploadMetadata(metadata: Record<string, unknown>) {
    const name = String(metadata.name ?? "metadata").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    return `ipfs://vaultx/mock-metadata/${name}.json`;
  }
}

