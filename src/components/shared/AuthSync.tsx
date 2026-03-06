"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

export default function AuthSync() {
  const { status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      localStorage.removeItem("immouser");
      sessionStorage.clear();
    }
  }, [status]);

  return null;
}
