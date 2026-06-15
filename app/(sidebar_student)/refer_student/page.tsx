"use client";

import React, { useState, FormEvent } from 'react';
import { Send } from 'lucide-react';

// Form state interface definition
interface ReferralFormData {
  studentName: string;
  studentId: string;
  grade: string;
  section: string;
  concernType: string;
  priorityLevel: string;
  description: string;
  observedBehaviors: string;
}

export const ReferStudentForm: React.FC = () => {
  // Initialize form state matching the fields across images
  const [formData, setFormData] = useState<ReferralFormData>({
    studentName: '',
    studentId: '',
    grade: '',
    section: '',
    concernType: '',
    priorityLevel: 'Medium', // Defaults to 'Medium' as seen in image_90f762.png
    description: '',
    observedBehaviors: '',
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    console.log('Referral Submitted Data:', formData);
    // Add submission processing logic here
  };

  return (
    <div className="flex-1 bg-[#f8fafc] p-8 overflow-y-auto min-h-screen font-sans antialiased text-slate-800">
      
      {/* 1. Header Section (from image_90f762.png) */}
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-[#0d2343]">Refer a Student</h1>
        <p className="text-sm text-slate-500 mt-1">
          Help a fellow student by referring them to the Guidance Office
        </p>
      </header>

      <div className="max-w-4xl space-y-4">
        
        {/* 2. Informational Banner Blocks (from image_90f762.png) */}
        {/* Blue Info Banner */}
        <div className="bg-[#f0f6ff] border border-blue-200 text-[#1d63ff] rounded-xl p-4 text-sm leading-relaxed">
          <span className="font-bold">Peer Support:</span> If you notice a fellow student who may need support, you can refer them to the Guidance Office. All referrals are confidential and will be handled with care.
        </div>

        {/* Green Info Banner */}
        <div className="bg-[#e8fbf0] border border-green-200 text-[#00c853] rounded-xl p-4 text-sm leading-relaxed">
          Looking out for each other is an important part of building a supportive school community. Your concern for your peers makes a difference.
        </div>

        {/* 3. Main Form Card Panel (Stitched seamlessly between images) */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5 mt-6">
          
          {/* Row 1: Student Name & Student ID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Student Name <span className="text-[#ff2b3d]">*</span>
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
              <label className="text-xs font-bold text-slate-700 block">
                Student ID <span className="text-[#ff2b3d]">*</span>
              </label>
              <input
                type="text"
                name="studentId"
                value={formData.studentId}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Row 2: Grade & Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Grade <span className="text-[#ff2b3d]">*</span>
              </label>
              <div className="relative">
                <select
                  name="grade"
                  value={formData.grade}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-slate-700"
                >
                  <option value="" disabled>Select grade...</option>
                  <option value="11">Grade 11</option>
                  <option value="12">Grade 12</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                  ▼
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Section <span className="text-[#ff2b3d]">*</span>
              </label>
              <div className="relative">
                <select
                  name="section"
                  value={formData.section}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-slate-700"
                >
                  <option value="" disabled>Select grade first</option>
                  <option value="STEM-A">STEM-A</option>
                  <option value="STEM-B">STEM-B</option>
                  <option value="ABM-A">ABM-A</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                  ▼
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Type of Concern & Priority Level */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Type of Concern <span className="text-[#ff2b3d]">*</span>
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
                  <option value="Academic">Academic Stress</option>
                  <option value="Personal">Personal Issues</option>
                  <option value="Behavioral">Behavioral Observation</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                  ▼
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Priority Level <span className="text-[#ff2b3d]">*</span>
              </label>
              <div className="relative">
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
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                  ▼
                </div>
              </div>
            </div>
          </div>

          {/* Text Area 1: Description of Concern */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Description of Concern <span className="text-[#ff2b3d]">*</span>
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
            <label className="text-xs font-bold text-slate-700 block">
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

          {/* 4. Emergency Alert Box (from image_90fa09.png) */}
          <div className="bg-[#fff1ec] border border-[#ffe0d3] rounded-xl p-4 text-sm leading-relaxed">
            <span className="font-bold text-[#b43403]">Emergency Situations:</span>{' '}
            <span className="text-[#b43403]/90">
              If this is an emergency or the student is in immediate danger, please notify a teacher, school staff, or go directly to the Guidance Office right away.
            </span>
          </div>

          {/* 5. Bottom Action Controls Footer Area (from image_90fa09.png) */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              className="w-full sm:w-auto px-12 py-2.5 bg-[#f1f5f9] hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-sm transition-colors text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#1d63ff] hover:bg-blue-700 text-white font-semibold py-2.5 px-8 rounded-xl transition-colors text-sm shadow-sm"
            >
              <Send size={16} className="rotate-0 stroke-[2.5]" />
              <span>Submit Referral</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default ReferStudentForm;