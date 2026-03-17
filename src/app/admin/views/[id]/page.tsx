import { notFound } from "next/navigation";
import { AdminBreadcrumbs } from "@/components/admin/AdminBreadcrumbs";
import { ViewBuilder } from "@/components/admin/ViewBuilder";
import { requireAdminPageAccess } from "@/lib/admin-page";
import { getViewConfigById, listSourceConfigs } from "@/lib/config/store";

export default async function ViewEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdminPageAccess(`/admin/views/${id}`);
  const [sources, view] = await Promise.all([listSourceConfigs(), id === "new" ? Promise.resolve(null) : getViewConfigById(id)]);
  const isNew = id === "new";

  if (!isNew && !view) {
    notFound();
  }

  return (
    <>
      <AdminBreadcrumbs
        items={[
          { href: "/admin", label: "Dashboard" },
          { href: "/admin/views", label: "Views" },
          { href: null, label: view?.label ?? "New view" },
        ]}
      />
      <ViewBuilder initialView={view} sources={sources} isNew={isNew} />
    </>
  );
}