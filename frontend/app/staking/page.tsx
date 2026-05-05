import { ProductDataPage } from "@/components/ProductDataPage";

export default function StakingPage() {
  return <ProductDataPage active="staking" title="Staking" endpoint="/product/staking" walletRequired />;
}
