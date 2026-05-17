import { ProductDataPage } from "@/components/ProductDataPage";

export default function StrategyEnginePage() {
  return <ProductDataPage active="strategy-engine" title="Strategy Engine" endpoint="/product/instant-sell" walletRequired />;
}
