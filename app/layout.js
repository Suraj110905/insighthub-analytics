import "./globals.css";
import ClientProviders from "@/components/ClientProviders";

export const metadata = {
  title: "InsightHub | Business Analytics & Insights",
  description: "Minimal, assessment-ready business analytics dashboard for metrics, KPI calculations, and data visualization.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
