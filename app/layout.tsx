import type { Metadata } from "next";
import "./globals.css";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { DataCacheProvider } from "@/hooks/use-data-cache";
import { Suspense } from "react";
import { Sidebar } from "@/components/sidebar";
import { NotificationsBell } from "@/components/notifications-bell";
import { AppThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Gestio - Sistema de Gestión de Ventas",
  description: "Sistema completo de gestión de ventas, clientes y productos",
};

import { Header } from "@/components/header";
import { WindowTitleBar } from "@/components/window-title-bar";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased overflow-hidden">
        <AppThemeProvider>
          <DataCacheProvider>
            <div className="flex flex-col h-screen bg-background">
              <WindowTitleBar />
              <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 flex flex-col overflow-hidden bg-muted/5">
                  <Header />
                  <div className="flex-1 overflow-y-auto">
                    <Suspense fallback={<div>Loading...</div>}>
                      {children}
                    </Suspense>
                  </div>
                </main>
              </div>
            </div>
          </DataCacheProvider>

          <SonnerToaster position="bottom-center" duration={1600} />
        </AppThemeProvider>
      </body>
    </html>
  );
}
