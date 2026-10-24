import type { Metadata } from "next";
import { AuditPanel } from "@/components/audit/audit-panel";

export const metadata: Metadata = { title: "Auditoría" };

export default function AuditPage() {
  return <AuditPanel />;
}
