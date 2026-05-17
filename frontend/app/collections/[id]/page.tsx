import { CollectionDetailReferencePage } from "@/components/reference-data-pages";

export default async function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CollectionDetailReferencePage id={id} />;
}
