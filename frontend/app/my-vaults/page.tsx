import { ProductDataPage } from "@/components/ProductDataPage";

export default function MyVaultsPage() {
  return <ProductDataPage active="my-vaults" title="My Vaults" endpoint="/product/profile" walletRequired />;
}
