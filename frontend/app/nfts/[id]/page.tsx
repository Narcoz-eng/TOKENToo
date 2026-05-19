import { ProductDataPage } from "@/components/ProductDataPage";

export default async function NftDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductDataPage active="marketplace" title="Vault NFT Detail" endpoint={`/product/nfts/${encodeURIComponent(id)}`} />;
}
