import { ProductDataPage } from "@/components/ProductDataPage";

export default async function RaidRoomPage({ params }: { params: Promise<{ id: string; raidId: string }> }) {
  const { id, raidId } = await params;
  return <ProductDataPage active="raids" title="Live Raid Room" endpoint={`/product/collections/${encodeURIComponent(id)}/raids/${encodeURIComponent(raidId)}`} />;
}
