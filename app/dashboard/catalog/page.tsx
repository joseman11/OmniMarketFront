import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogManager } from "@/components/catalog/catalog-manager";
import CatalogLoading from "./loading";

export const metadata: Metadata = { title: "Catálogo" };

export default function CatalogPage() {
  // useSearchParams (enlace «Crear producto») requiere un límite de Suspense.
  return (
    <Suspense fallback={<CatalogLoading />}>
      <CatalogManager />
    </Suspense>
  );
}
