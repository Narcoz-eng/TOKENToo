import { ProductDataPage } from "@/components/ProductDataPage";

export default async function CommunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductDataPage active="profile" title="Collection Community Hub" endpoint={`/product/collections/${encodeURIComponent(id)}/community`} />;
}
