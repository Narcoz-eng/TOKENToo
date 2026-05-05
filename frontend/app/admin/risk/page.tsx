import { ProductDataPage } from "@/components/ProductDataPage";

export default function AdminRiskPage() {
  return <ProductDataPage active="admin" title="Admin Risk Dashboard" endpoint="/product/admin/risk" />;
}
