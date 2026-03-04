"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils"; 

interface BackButtonProps {
  label?: string;
  className?: string;
}

export default function BackButton({ label = "Retour", className }: BackButtonProps) {
  const router = useRouter();

  return (
    <button 
      onClick={() => router.back()} 
      className={cn("inline-flex items-center text-sm font-bold text-slate-500 hover:text-orange-500 transition mb-4 group", className)}
    >
      <ArrowLeft className="w-4 h-4 mr-1 transition-transform group-hover:-translate-x-1" />
      {label}
    </button>
  );
}
