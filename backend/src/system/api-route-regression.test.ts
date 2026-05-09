import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { loadLocalEnv } from "../env/load-local-env";
import { GeneratorController } from "../generator/generator.controller";
import { ProductDataController } from "../product-data/product-data.controller";

async function main() {
  loadLocalEnv();
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  try {
    const product = app.get(ProductDataController, { strict: false });
    const generator = app.get(GeneratorController, { strict: false });

    const home = await product.home();
    assert(home && typeof home === "object" && "ok" in home, "ProductDataController.home did not return an API envelope.");

    const presets = generator.presets();
    assert(Array.isArray(presets) && presets.length > 0, "GeneratorController.presets did not return presets.");
  } finally {
    await app.close();
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
