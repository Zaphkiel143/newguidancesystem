"use client";

import React, { useEffect, useState } from 'react';
import { Search, AlertTriangle, Clock, CheckCircle, X } from 'lucide-react';
import { listReferrals, updateReferralStatus, addReferralNotes, sendReferralFeedback } from '../../action/counselor';
import type { Referral } from '../../../lib/generated';

type ModalState = { type: 'notes' | 'feedback'; referral: Referral } | null;

const ReferralManagement = () => {
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [modal, setModal] = useState<ModalState>(null);
  const [modalText, setModalText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const refresh = async () => {
    const data = await listReferrals();
    setReferrals(data);
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const data = await listReferrals();
      if (!cancelled) setReferrals(data);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const statusForFilter: Record<string, string | null> = {
    All: null,
    Open: 'OPEN',
    'In Progress': 'IN_PROGRESS',
    Closed: 'CLOSED',
  };

  const filteredReferrals = referrals.filter((r) => {
    const expectedStatus = statusForFilter[filter];
    if (expectedStatus && r.status !== expectedStatus) return false;

    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      r.studentName.toLowerCase().includes(query) ||
      r.referrerName.toLowerCase().includes(query) ||
      r.description.toLowerCase().includes(query) ||
      r.concernType.toLowerCase().includes(query)
    );
  });

  const handleAdvanceStatus = async (referral: Referral, status: "IN_PROGRESS" | "CLOSED") => {
    setUpdatingId(referral.id);
    const result = await updateReferralStatus(referral.id, status);
    setUpdatingId(null);
    if (result.success) {
      await refresh();
    } else {
      alert(`Failed to update referral: ${result.error || "Unknown error"}`);
    }
  };

  const openModal = (type: 'notes' | 'feedback', referral: Referral) => {
    setModal({ type, referral });
    setModalText(type === 'notes' ? referral.notes || '' : '');
  };

  const closeModal = () => {
    setModal(null);
    setModalText('');
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal || !modalText.trim()) return;

    setIsSaving(true);
    const result = modal.type === 'notes'
      ? await addReferralNotes(modal.referral.id, modalText.trim())
      : await sendReferralFeedback(modal.referral.id, modalText.trim());
    setIsSaving(false);

    if (result.success) {
      closeModal();
      await refresh();
    } else {
      alert(`Failed to save: ${result.error || "Unknown error"}`);
    }
  };

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 min-h-[calc(100dvh-var(--topbar-h))] font-sans text-slate-900">
      {/* Header */}
      <header className="mb-8">
        <h1 className="page-title">Referral Management</h1>
        <p className="text-slate-500 text-sm">Track and manage student referrals from faculty, students, and parents</p>
      </header>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <div className="relative w-full md:max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
                aria-label="Search referrals"
            placeholder="Search referrals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
          />
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
          {['All', 'Open', 'In Progress', 'Closed'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                filter === tab
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Referral Cards List */}
      <div className="space-y-6">
        {filteredReferrals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
            <p className="text-sm font-semibold text-slate-500">No referrals found</p>
          </div>
        ) : (
          filteredReferrals.map((referral) => (
            <ReferralCard
              key={referral.id}
              referral={referral}
              isUpdating={updatingId === referral.id}
              onAdvanceStatus={handleAdvanceStatus}
              onAddNotes={() => openModal('notes', referral)}
              onSendFeedback={() => openModal('feedback', referral)}
            />
          ))
        )}
      </div>

      {/* NOTES / FEEDBACK MODAL */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {modal.type === 'notes' ? 'Add Internal Notes' : 'Send Feedback'}
                </h3>
                <p className="text-xs text-slate-500">
                  {modal.type === 'notes'
                    ? `Internal notes for ${modal.referral.studentName}'s referral`
                    : `Sent as a message to ${modal.referral.referrerName}`}
                </p>
              </div>
              <button
                onClick={closeModal}
                aria-label="Close" className="w-11 h-11 -m-2 grid place-items-center text-slate-500 hover:text-ink hover:bg-slate-100 rounded-md transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-4">
              <textarea
                rows={4}
                value={modalText}
                onChange={(e) => setModalText(e.target.value)}
                placeholder={modal.type === 'notes' ? 'Internal notes...' : 'Write feedback for the referrer...'}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none resize-none"
                required
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl transition"
                >
                  {isSaving ? "Saving..." : modal.type === 'notes' ? "Save Notes" : "Send Feedback"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

interface ReferralCardProps {
  referral: Referral;
  isUpdating: boolean;
  onAdvanceStatus: (referral: Referral, status: "IN_PROGRESS" | "CLOSED") => void;
  onAddNotes: () => void;
  onSendFeedback: () => void;
}

const ReferralCard = ({ referral, isUpdating, onAdvanceStatus, onAddNotes, onSendFeedback }: ReferralCardProps) => {
  const isHigh = referral.priority === 'High' || referral.priority === 'Urgent';
  const isOpen = referral.status === 'OPEN';
  const isClosed = referral.status === 'CLOSED';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-hover hover:shadow-md">
      <div className="p-6">
        {/* Card Header Tags */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">{referral.studentName}</h3>
            <p className="text-xs font-semibold text-slate-500 tracking-tight">
              Referred by {referral.referrerName} ({referral.referrerRole})
            </p>
          </div>

          <div className="flex gap-2">
            <span className={`px-3 py-1 rounded text-xs font-semibold border ${
              isHigh ? 'bg-red-50 text-red-600 border-red-100' : 'bg-orange-50 text-orange-600 border-orange-100'
            }`}>
              {referral.priority}
            </span>
            <span className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-semibold border ${
              isOpen ? 'bg-red-50 text-red-600 border-red-100' : isClosed ? 'bg-green-50 text-green-600 border-green-100' : 'bg-orange-50 text-orange-600 border-orange-100'
            }`}>
              {isOpen ? <AlertTriangle size={12}/> : isClosed ? <CheckCircle size={12} /> : <Clock size={12}/>}
              {referral.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Details Section */}
        <div className="space-y-1 mb-4">
          <p className="text-sm text-slate-600"><span className="text-slate-500">Concern type:</span> {referral.concernType}</p>
          <p className="text-sm text-slate-600"><span className="text-slate-500">Date:</span> {new Date(referral.createdAt).toLocaleDateString()}</p>
          <p className="text-xs font-semibold text-slate-500 mt-2">Description:</p>
        </div>

        {/* Reason Box */}
        <div className="bg-slate-50/80 p-4 rounded-lg border border-slate-100 mb-4 italic text-sm text-slate-700 whitespace-pre-wrap">
          {referral.description}
        </div>

        {referral.notes && (
          <div className="bg-blue-50/60 p-4 rounded-lg border border-blue-100 mb-6 text-sm text-slate-700">
            <p className="text-xs font-semibold text-blue-600 mb-1">Internal Notes</p>
            {referral.notes}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {!isClosed && (
            isOpen ? (
              <button
                onClick={() => onAdvanceStatus(referral, "IN_PROGRESS")}
                disabled={isUpdating}
                className="px-4 py-2 bg-orange-50 text-orange-600 text-xs font-semibold rounded-lg border border-orange-100 hover:bg-orange-100 transition-colors disabled:opacity-50"
              >
                {isUpdating ? "Updating..." : "Start Intervention"}
              </button>
            ) : (
              <button
                onClick={() => onAdvanceStatus(referral, "CLOSED")}
                disabled={isUpdating}
                className="px-4 py-2 bg-green-50 text-green-600 text-xs font-semibold rounded-lg border border-green-100 hover:bg-green-100 transition-colors disabled:opacity-50"
              >
                {isUpdating ? "Updating..." : "Mark as Resolved"}
              </button>
            )
          )}
          <button
            onClick={onAddNotes}
            className="px-4 py-2 bg-blue-50 text-blue-600 text-xs font-semibold rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors"
          >
            Add Notes
          </button>
          <button
            onClick={onSendFeedback}
            className="px-4 py-2 bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg border border-slate-100 hover:bg-slate-100 transition-colors"
          >
            Send Feedback
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReferralManagement;
