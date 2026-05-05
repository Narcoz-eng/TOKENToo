import { ProductDataPage } from "@/components/ProductDataPage";

export default function NftDetailPage({ params }: { params: { id: string } }) {
  return <ProductDataPage active="marketplace" title="Vault NFT Detail" endpoint={`/product/nfts/${params.id}`} />;
}
