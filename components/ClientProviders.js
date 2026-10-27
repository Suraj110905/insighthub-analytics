"use client";

import { AuthProvider } from "@/lib/AuthContext";
import AuthModal from "@/components/AuthModal";

export default function ClientProviders({ children }) {
  return (
    <AuthProvider>
      {children}
      <AuthModal />
    </AuthProvider>
  );
}
