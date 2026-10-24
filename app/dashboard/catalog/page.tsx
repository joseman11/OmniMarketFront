import type { Metadata } from "next";
import { CatalogManager } from "@/components/catalog/catalog-manager";

export const metadata: Metadata = { title: "Catálogo" };

export default function CatalogPage() {
  return <CatalogManager />;
}
