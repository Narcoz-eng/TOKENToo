import { ProductDataPage } from "@/components/ProductDataPage";

export default function ProfilePage() {
  return <ProductDataPage active="my-vaults" title="Wallet Portfolio" endpoint="/product/profile" walletRequired />;
}
