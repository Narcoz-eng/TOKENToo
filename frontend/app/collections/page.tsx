import { ProductDataPage } from "@/components/ProductDataPage";

export default function CollectionsPage() {
  return <ProductDataPage active="collections" title="Collections" endpoint="/product/collections" />;
}
