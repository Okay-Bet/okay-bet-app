// Common/Navbar.jsx
// top banner for website, may not be used

import React from "react";
import Image from "next/image";
import Link from "next/link";
import logo from "@public/okay_bet.png";

const Navbar = () => {
  return (
    <nav className="flex items-center justify-between p-4 bg-quaternary text-quaternary">
      <Link legacyBehavior href="/">
        <a>
          <Image src={logo} alt="Okay Bet Logo" width={150} height={50} className="cursor-pointer" />
        </a>
      </Link>
    </nav>
  );
};

export default Navbar;
