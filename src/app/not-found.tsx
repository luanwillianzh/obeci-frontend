"use client";
import { useEffect } from "react";
import { useAuth } from "@/contexts/useAuth";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace("/protected/turmas");
      } else {
        router.replace("/login");
      }
    }
  }, [loading, user, router]);

  return null;
}
