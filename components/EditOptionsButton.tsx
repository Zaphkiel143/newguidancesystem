"use client";

import React, { useState } from "react";
import { Pencil } from "lucide-react";
import EditOptionsModal from "./EditOptionsModal";

interface EditOptionsButtonProps {
  listKey: string;
  listLabel: string;
  onSaved?: () => void;
  className?: string;
  // Shows "Edit <text>" next to the icon
  text?: string;
}

// Small inline trigger, dropped next to a dropdown
export default function EditOptionsButton({ listKey, listLabel, onSaved, className, text }: EditOptionsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={`Edit ${listLabel} choices`}
        title={`Edit ${listLabel} choices`}
        className={className ?? `text-slate-400 hover:text-blue-600 rounded-md hover:bg-slate-100 transition inline-flex items-center ${text ? "gap-1.5 px-2 py-1.5 text-xs font-medium" : "p-1"}`}
      >
        <Pencil size={13} />
        {text}
      </button>
      {isOpen && <EditOptionsModal listKey={listKey} listLabel={listLabel} onClose={() => setIsOpen(false)} onSaved={onSaved} />}
    </>
  );
}
