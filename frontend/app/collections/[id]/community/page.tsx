import { ProductDataPage } from "@/components/ProductDataPage";

export default function CommunityPage({ params }: { params: { id: string } }) {
  return <ProductDataPage active="profile" title="Collection Community Hub" endpoint={`/product/collections/${params.id}/community`} />;
}
