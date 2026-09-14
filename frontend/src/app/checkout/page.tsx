import { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";
import { CheckoutPageView } from "./CheckoutPageView";

export const metadata: Metadata = {
  title: `Checkout | ${SITE_NAME}`,
  robots: { index: false, follow: true },
};

export default function CheckoutPage() {
  return <CheckoutPageView />;
}
