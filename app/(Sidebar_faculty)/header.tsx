"use client";

import React from 'react';

const Header = () => {
  return (
    <header className="h-16 bg-blue-600 text-white flex items-center justify-between px-8 fixed top-0 left-0 right-0 z-80 shadow-md">
      <div className="flex items-center gap-4">
        <div className="bg-white p-1 rounded-md flex items-center justify-center shadow-sm">
          <span className="text-blue-600 font-bold text-[10px] px-1.5 py-0.5">STI</span>
        </div>
        <div className="flex flex-col">
          <h2 className="text-sm font-bold leading-tight tracking-tight uppercase">E-Gabay STI</h2>
          <p className="text-[10px] font-medium opacity-90">Guidance Management System</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-right flex flex-col justify-center border-r border-white/20 pr-6">
          <p className="text-sm font-bold leading-none">Cho Sto Domingo</p>
          <p className="text-[10px] opacity-80 mt-1">Faculty</p>
        </div>
      </div>
    </header>
  );
};

export default Header;