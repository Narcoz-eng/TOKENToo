import { ProductDataPage } from "@/components/ProductDataPage";

export default function RaidRoomPage({ params }: { params: { id: string; raidId: string } }) {
  return <ProductDataPage active="raids" title="Live Raid Room" endpoint={`/product/collections/${params.id}/raids/${params.raidId}`} />;
}
