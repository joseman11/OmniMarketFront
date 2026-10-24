import type { Metadata } from "next";
import { OrderDetail } from "@/components/orders/order-detail";

export const metadata: Metadata = { title: "Detalle de orden" };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderDetail orderId={id} />;
}
