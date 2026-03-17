import { notFound } from "next/navigation";
import { ViewBuilder } from "@/components/admin/ViewBuilder";
import { getViewConfigById, listSourceConfigs } from "@/lib/config/store";

export default async function ViewEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [sources, view] = await Promise.all([listSourceConfigs(), id === "new" ? Promise.resolve(null) : getViewConfigById(id)]);
  const isNew = id === "new";

  if (!isNew && !view) {
    notFound();
  }

  return <ViewBuilder initialView={view} sources={sources} isNew={isNew} />;
}
