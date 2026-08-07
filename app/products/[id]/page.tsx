import { notFound } from "next/navigation";
import { allProductIds, productPage } from "@/lib/productPages";
import ProductPageView from "@/components/product/ProductPage";

/** Static export: every product page is prerendered from the approved data. */
export function generateStaticParams() {
  return allProductIds().map((id) => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = productPage(id);
  if (!p) return {};
  return {
    title: `${p.label} by Lumin`,
    description: p.headline,
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = productPage(id);
  if (!product) notFound();
  return <ProductPageView product={product} />;
}
