import { ProductDataPage } from "@/components/ProductDataPage";

export default function ProfilePage() {
  return <ProductDataPage active="profile" title="Profile Dashboard" endpoint="/product/profile" walletRequired />;
}
