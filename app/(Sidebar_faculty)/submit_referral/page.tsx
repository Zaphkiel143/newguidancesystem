"use client";

import React, { useState, FormEvent } from 'react';
import { Send } from 'lucide-react';
import { submitReferral } from '../../action/faculty';


interface ReferralFormData {
  studentName: string;
  studentId: string;
  gradeSection: string;
  concernType: string;
  priorityLevel: string;
  description: string;
  observedBehaviors: string;
}

const EMPTY_FORM: ReferralFormData = {
  studentName: '',
  studentId: '',
  gradeSection: '',
  concernType: '',
  priorityLevel: 'Medium',
  description: '',
  observedBehaviors: '',
};

export const SubmitReferralForm: React.FC = () => {
  const [formData, setFormData] = useState<ReferralFormData>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    const detailLines = [
      formData.studentId && `Student ID: ${formData.studentId}`,
      formData.gradeSection && `Grade & Section: ${formData.gradeSection}`,
      formData.observedBehaviors && `Observed Behaviors: ${formData.observedBehaviors}`,
    ].filter(Boolean);

    const result = await submitReferral({
      studentName: formData.studentName,
      concernType: formData.concernType,
      priority: formData.priorityLevel,
      description: [formData.description, ...detailLines].join("\n\n"),
    });

    setIsSaving(false);

    if (result.success) {
      setSuccessMessage("Referral submitted successfully. The Guidance Office will review it shortly.");
      setFormData(EMPTY_FORM);
    } else {
      setError(result.error || "Failed to submit referral.");
    }
  };

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 min-h-[calc(100dvh-var(--topbar-h))] font-sans antialiased text-slate-800">

      {/* 1. Header Section */}
      <header className="mb-6">
        <h1 className="page-title">Submit Referral</h1>
        <p className="text-sm text-slate-500 mt-1">
          Refer a student to the Guidance Office for support
        </p>
      </header>

      <div className="max-w-4xl space-y-4">

        {/* 2. Informational Banner */}
        <div className="bg-blue-50 border border-blue-200 text-blue-600 rounded-xl p-4 text-sm leading-relaxed">
          <span className="font-semibold">Faculty Referral:</span> If you notice a student who may need support, you can refer them to the Guidance Office. All referrals are confidential and will be handled with care.
        </div>

        {/* 3. Main Form Card Panel */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5 mt-6">

          {/* Row 1: Student Name & Student ID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Student Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="studentName"
                value={formData.studentName}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Student ID
              </label>
              <input
                type="text"
                name="studentId"
                value={formData.studentId}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Row 2: Grade & Section, Type of Concern */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Grade & Section
              </label>
              <input
                type="text"
                name="gradeSection"
                value={formData.gradeSection}
                onChange={handleInputChange}
                placeholder="e.g., Grade 12 - STEM-A"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Type of Concern <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  name="concernType"
                  value={formData.concernType}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-slate-700"
                >
                  <option value="" disabled>Select concern type...</option>
                  <option value="Academic">Academic Concern</option>
                  <option value="Behavioral">Behavioral Observation</option>
                  <option value="Attendance">Attendance Concern</option>
                  <option value="Personal">Personal Issues</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                  ▼
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Priority Level */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Priority Level <span className="text-rose-500">*</span>
            </label>
            <div className="relative max-w-xs">
              <select
                name="priorityLevel"
                value={formData.priorityLevel}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-slate-700"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                ▼
              </div>
            </div>
          </div>

          {/* Text Area 1: Description of Concern */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Description of Concern <span className="text-rose-500">*</span>
            </label>
            <textarea
              name="description"
              rows={4}
              value={formData.description}
              onChange={handleInputChange}
              required
              placeholder="Please describe what you've observed or what concerns you about this student..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-none"
            />
          </div>

          {/* Text Area 2: Observed Behaviors (Optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Observed Behaviors (Optional)
            </label>
            <textarea
              name="observedBehaviors"
              rows={3}
              value={formData.observedBehaviors}
              onChange={handleInputChange}
              placeholder="Describe any specific behaviors or patterns you've noticed..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-none"
            />
          </div>

          {/* Emergency Alert Box */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm leading-relaxed">
            <span className="font-semibold text-orange-800">Emergency Situations:</span>{' '}
            <span className="text-orange-800/90">
              If this is an emergency or the student is in immediate danger, please notify school administration right away.
            </span>
          </div>

          {successMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm font-semibold rounded-xl">
              {successMessage}
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-semibold rounded-xl">
              {error}
            </div>
          )}

          {/* Bottom Action Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setFormData(EMPTY_FORM)}
              className="w-full sm:w-auto px-12 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-full text-sm transition-colors text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 px-8 rounded-full transition-colors text-sm shadow-sm"
            >
              <Send size={16} className="stroke-[2.5]" />
              <span>{isSaving ? "Submitting..." : "Submit Referral"}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default SubmitReferralForm;
