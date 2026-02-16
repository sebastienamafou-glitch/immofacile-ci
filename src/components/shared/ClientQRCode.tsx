"use client"; // ✅ C'est lui qui gère le côté client

import { QRCodeCanvas } from "qrcode.react";

interface ClientQRCodeProps {
  value: string;
  size?: number;
  level?: string;
  marginSize?: number;
}

export default function ClientQRCode({ value, size = 128, level = "H", marginSize = 0 }: ClientQRCodeProps) {
  return (
    <QRCodeCanvas 
        value={value} 
        size={size} 
        level={level as any} 
        marginSize={marginSize}
    />
  );
}
