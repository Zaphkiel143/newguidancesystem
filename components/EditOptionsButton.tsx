"use client";

import React, { useState } from "react";
import { Pencil } from "lucide-react";
import EditOptionsModal from "./EditOptionsModal";

interface EditOptionsButtonProps {
  listKey: string;
  listLabel: string;
  onSaved?: () => void;
  className?: string;
}

// Small inline trigger, dropped next to a dropdown on the counselor's own
// pages, that opens EditOptionsModal for that dropdown's option list.
export default function EditOptionsButton({ listKey, listLabel, onSaved, className }: EditOptionsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={`Edit ${listLabel} choices`}
        title={`Edit ${listLabel} choices`}
        className={className ?? "text-slate-400 hover:text-blue-600 p-1 rounded-md hover:bg-slate-100 transition inline-flex items-center"}
      >
        <Pencil size={13} />
      </button>
      {isOpen && <EditOptionsModal listKey={listKey} listLabel={listLabel} onClose={() => setIsOpen(false)} onSaved={onSaved} />}
    </>
  );
}
