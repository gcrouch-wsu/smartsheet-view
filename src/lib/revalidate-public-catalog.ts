import { revalidatePath } from "next/cache";

/** Public homepage lists published pages; call after any admin change that affects sources/views/publish state. */
export function revalidatePublicCatalog() {
  revalidatePath("/");
}
