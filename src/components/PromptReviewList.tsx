import React, { useState } from 'react';
import { Sparkles, RefreshCw, CheckCircle2, Wand2, Edit3, Check, ChevronRight, Video, ImageIcon, Eye } from 'lucide-react';
import { CountdownSlot } from '../types';

interface PromptReviewListProps {
  slots: CountdownSlot[];
  brandName: string;
  themeContext: string;
  onUpdatePrompt: (slotIndex: number, newPrompt: string, newConcept?: string, newVideoPrompt?: string) => void;
  onRecreatePrompt: (slotIndex: number) => Promise<void>;
  onToggleApprovePrompt: (slotIndex: number) => void;
  onApproveAllPrompts: () => void;
  onProceedToImageGeneration: () => void;
  isGeneratingImages: boolean;
}

export const PromptReviewList: React.FC<PromptReviewListProps> = ({
  slots,
  brandName,
  themeContext,
  onUpdatePrompt,
  onRecreatePrompt,
  onToggleApprovePrompt,
  onApproveAllPrompts,
  onProceedToImageGeneration,
  isGeneratingImages,
}) => {
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [editingImageType, setEditingImageType] = useState<'image' | 'video'>('image');
  const [editingImageText, setEditingImageText] = useState('');
  const [editingVideoText, setEditingVideoText] = useState('');

  const numberBadges: Record<number, string> = {
    10: 'bg-[#4285F4] text-white',
    9: 'bg-[#EA4335] text-white',
    8: 'bg-[#FBBC04] text-slate-900',
    7: 'bg-[#34A853] text-white',
    6: 'bg-[#4285F4] text-white',
    5: 'bg-[#EA4335] text-white',
    4: 'bg-[#FBBC04] text-slate-900',
    3: 'bg-[#34A853] text-white',
    2: 'bg-[#4285F4] text-white',
    1: 'bg-[#EA4335] text-white',
  };

  const approvedCount = slots.filter((s) => s.isPromptApproved).length;
  const allApproved = approvedCount === slots.length;

  const handleStartEdit = (slot: CountdownSlot, type: 'image' | 'video') => {
    setEditingSlotIndex(slot.index);
    setEditingImageType(type);
    setEditingImageText(slot.imagePrompt);
    setEditingVideoText(slot.videoPrompt || '');
  };

  const handleSaveEdit = (slotIndex: number) => {
    onUpdatePrompt(slotIndex, editingImageText, undefined, editingVideoText);
    setEditingSlotIndex(null);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 animate-fadeIn transition-colors duration-200">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-[#4285F4]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Step 2: Review Coordinated Image & Video Reveal Prompts
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950 text-[#4285F4] border border-blue-200 dark:border-blue-800">
                {approvedCount}/10 Approved
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              The starting images conceal/subtly frame the number; the coordinated Veo 3 camera motion reveals it.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 self-end md:self-center">
          {!allApproved && (
            <button
              type="button"
              onClick={onApproveAllPrompts}
              className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#34A853]" />
              <span>Approve All (10)</span>
            </button>
          )}

          <button
            type="button"
            onClick={onProceedToImageGeneration}
            disabled={isGeneratingImages}
            className="px-6 py-2.5 rounded-2xl bg-[#4285F4] hover:bg-blue-600 active:scale-98 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-blue-500/25 flex items-center gap-2 transition-all"
          >
            {isGeneratingImages ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Synthesizing Images (2 Workers)...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-3.5 h-3.5" />
                <span>Create Veo 3 Input Images ({approvedCount}/10 Ready)</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* 10 Prompt Cards List */}
      <div className="space-y-4">
        {slots.map((slot) => {
          const isEditing = editingSlotIndex === slot.index;
          return (
            <div
              key={slot.index}
              className={`p-5 rounded-2xl border transition-all space-y-3.5 ${
                slot.isPromptApproved
                  ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300/80 dark:border-emerald-800/80'
                  : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Top Row: Badge, Concept, Reveal Mechanism, Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shadow-md shrink-0 ${
                      numberBadges[slot.diegeticNumber] || 'bg-[#4285F4] text-white'
                    }`}
                  >
                    {slot.index < 10 ? `0${slot.index}` : slot.index}
                  </span>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      {slot.sceneConcept || `Diegetic Shot #${slot.index}`}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-[#4285F4] dark:text-blue-400 font-mono font-medium">
                        Countdown #{slot.diegeticNumber}
                      </span>
                      {slot.revealMechanism && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 text-[10px] font-semibold border border-purple-200 dark:border-purple-800/80 flex items-center gap-1">
                          <Eye className="w-3 h-3 text-purple-500" />
                          <span>Reveal: {slot.revealMechanism}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Toolbar */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => onRecreatePrompt(slot.index)}
                    disabled={slot.isPromptRecreating}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-semibold transition-colors disabled:opacity-50"
                    title="Generate a new creative prompt for this number using Gemini"
                  >
                    <RefreshCw className={`w-3 h-3 text-purple-600 dark:text-purple-400 ${slot.isPromptRecreating ? 'animate-spin' : ''}`} />
                    <span>{slot.isPromptRecreating ? 'Re-creating...' : 'Re-create'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => (isEditing ? handleSaveEdit(slot.index) : handleStartEdit(slot, 'image'))}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-colors"
                  >
                    {isEditing ? <Check className="w-3 h-3 text-[#34A853]" /> : <Edit3 className="w-3 h-3 text-slate-500" />}
                    <span>{isEditing ? 'Save Edit' : 'Edit Prompts'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleApprovePrompt(slot.index)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      slot.isPromptApproved
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{slot.isPromptApproved ? 'Approved' : 'Approve'}</span>
                  </button>
                </div>
              </div>

              {/* Coordinated Prompts View / Edit */}
              {isEditing ? (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3 text-[#4285F4]" />
                      <span>1. Starting Image Prompt (Plans Reveal / Number Concealed or Distant)</span>
                    </label>
                    <textarea
                      rows={3}
                      value={editingImageText}
                      onChange={(e) => setEditingImageText(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-[#4285F4] text-xs text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                      <Video className="w-3 h-3 text-purple-500" />
                      <span>2. Coordinated Veo 3 Video Motion (Reveals Number #{slot.diegeticNumber})</span>
                    </label>
                    <textarea
                      rows={3}
                      value={editingVideoText}
                      onChange={(e) => setEditingVideoText(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-purple-500 text-xs text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingSlotIndex(null)}
                      className="px-3 py-1 text-xs text-slate-500 hover:underline"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(slot.index)}
                      className="px-4 py-1.5 rounded-lg bg-[#4285F4] text-white text-xs font-bold"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {/* Image Prompt Box */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 space-y-1">
                    <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 uppercase tracking-wider">
                      <ImageIcon className="w-3 h-3" />
                      <span>Starting Image (Reveal Framing)</span>
                    </div>
                    <p className="text-xs font-mono text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3 hover:line-clamp-none">
                      {slot.imagePrompt}
                    </p>
                  </div>

                  {/* Video Motion Prompt Box */}
                  <div className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/60 space-y-1">
                    <div className="text-[10px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1 uppercase tracking-wider">
                      <Video className="w-3 h-3" />
                      <span>Veo 3 Motion (Number Reveal)</span>
                    </div>
                    <p className="text-xs font-mono text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3 hover:line-clamp-none">
                      {slot.videoPrompt || `Camera push-in brings diegetic number '${slot.diegeticNumber}' into crisp focus.`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/80">
        <div className="text-xs text-slate-500">
          All 10 prompts are coordinated for starting image framing and dynamic Veo 3 camera reveal.
        </div>
        <button
          type="button"
          onClick={onProceedToImageGeneration}
          disabled={isGeneratingImages}
          className="px-8 py-3.5 rounded-2xl bg-[#4285F4] hover:bg-blue-600 active:scale-98 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-blue-500/25 flex items-center gap-2.5 transition-all"
        >
          {isGeneratingImages ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Synthesizing Images (2 Workers)...</span>
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              <span>Create Veo 3 Input Images</span>
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
