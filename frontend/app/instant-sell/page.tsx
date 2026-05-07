import { ProductDataPage } from "@/components/ProductDataPage";

export default function InstantSellPage() {
  return <ProductDataPage active="instant-sell" title="Instant Sell" endpoint="/product/instant-sell" walletRequired />;
}
