'use client';

import Image from "next/image";
import logo from "../../../public/okay_bet.png";

export default function Logo() {
  return (
    <Image
      src={logo}
      alt="Okay Bet Logo"
      width={350}
      height={120}
      className="w-full h-auto object-contain"
      onClick={() => window.location.reload()}
      priority
    />
  );
}