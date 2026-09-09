import React, { useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Wand2,
  Edit3,
  Check,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Video,
  ImageIcon,
  Eye,
  ArrowUpDown,
} from 'lucide-react';
import { CountdownSlot } from '../types';
import { adaptPromptNumerals } from '../utils/promptBuilder';

interface PromptReviewListProps {
  slots: CountdownSlot[];
  brandName: string;
  themeContext: string;
  onUpdatePrompt: (
    slotIndex: number,
    newPrompt: string,
    newConcept?: string,
    newVideoPrompt?: string,
    newEndPrompt?: string
  ) => void;
  onRecreatePrompt: (slotIndex: number) => Promise<void>;
  onReorderSlots: (newSlots: CountdownSlot[]) => void;
  onProceedToImageGeneration: () => void;
  isGeneratingImages: boolean;
}

export const PromptReviewList: React.FC<PromptReviewListProps> = ({
  slots,
  brandName,
  themeContext,
  onUpdatePrompt,
  onRecreatePrompt,
  onReorderSlots,
  onProceedToImageGeneration,
  isGeneratingImages,
}) => {
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [editingStartText, setEditingStartText] = useState('');
  const [editingEndText, setEditingEndText] = useState('');
  const [editingVideoText, setEditingVideoText] = useState('');

  // Drag-and-Drop state
  const [draggedPos, setDraggedPos] = useState<number | null>(null);
  const [dragOverPos, setDragOverPos] = useState<number | null>(null);

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

  const handleStartEdit = (slot: CountdownSlot) => {
    setEditingSlotIndex(slot.index);
    setEditingStartText(slot.startImagePrompt || slot.imagePrompt);
    setEditingEndText(slot.endImagePrompt || '');
    setEditingVideoText(slot.videoPrompt || '');
  };

  const handleSaveEdit = (slotIndex: number) => {
    onUpdatePrompt(slotIndex, editingStartText, undefined, editingVideoText, editingEndText);
    setEditingSlotIndex(null);
  };

  // Reorder slots and automatically adapt embedded countdown numerals
  const moveSlot = (fromPos: number, toPos: number) => {
    if (fromPos === toPos || fromPos < 0 || toPos < 0 || fromPos >= slots.length || toPos >= slots.length) {
      return;
    }

    const reordered = [...slots];
    const [movedItem] = reordered.splice(fromPos, 1);
    reordered.splice(toPos, 0, movedItem);

    // Re-index slots strictly 10 down to 1 and adapt numbers inside prompt texts
    const updatedSlots: CountdownSlot[] = reordered.map((item, idx) => {
      const targetCountdownNum = 10 - idx;
      const oldNum = item.diegeticNumber;

      if (oldNum === targetCountdownNum) {
        return {
          ...item,
          index: targetCountdownNum,
          diegeticNumber: targetCountdownNum,
        };
      }

      const updatedStart = adaptPromptNumerals(item.startImagePrompt || item.imagePrompt, oldNum, targetCountdownNum);
      const updatedEnd = item.endImagePrompt
        ? adaptPromptNumerals(item.endImagePrompt, oldNum, targetCountdownNum)
        : item.endImagePrompt;

      return {
        ...item,
        index: targetCountdownNum,
        diegeticNumber: targetCountdownNum,
        imagePrompt: updatedStart,
        startImagePrompt: updatedStart,
        endImagePrompt: updatedEnd,
        videoPrompt: item.videoPrompt
          ? adaptPromptNumerals(item.videoPrompt, oldNum, targetCountdownNum)
          : item.videoPrompt,
        sceneConcept: adaptPromptNumerals(item.sceneConcept, oldNum, targetCountdownNum),
        revealMechanism: item.revealMechanism
          ? adaptPromptNumerals(item.revealMechanism, oldNum, targetCountdownNum)
          : item.revealMechanism,
        objectEmbedding: item.objectEmbedding
          ? adaptPromptNumerals(item.objectEmbedding, oldNum, targetCountdownNum)
          : item.objectEmbedding,
      };
    });

    onReorderSlots(updatedSlots);
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
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#4285F4] text-[10px] font-bold border border-blue-200 dark:border-blue-800">
                <ArrowUpDown className="w-3 h-3" />
                <span>Reorderable (Drag or ⬆ ⬇)</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Change order using drag handle or arrows. Prompt numbers automatically adapt to the new countdown positions.
            </p>
          </div>
        </div>

        {/* Action Button: Matched to Step 1 Generate 10 Text Prompts Button Size */}
        <div className="flex items-center gap-3 self-end md:self-center">
          <button
            type="button"
            onClick={onProceedToImageGeneration}
            disabled={isGeneratingImages}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#4285F4] hover:bg-blue-600 active:scale-98 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2.5 transition-all"
          >
            {isGeneratingImages ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Synthesizing Images (2 Workers)...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                <span>Create Veo 3 input images</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* 10 Prompt Cards List */}
      <div className="space-y-4">
        {slots.map((slot, pos) => {
          const isEditing = editingSlotIndex === slot.index;
          const isBeingDragged = draggedPos === pos;
          const isDragOver = dragOverPos === pos;

          return (
            <div
              key={`slot-pos-${pos}-${slot.index}`}
              draggable={!isEditing}
              onDragStart={() => setDraggedPos(pos)}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverPos(pos);
              }}
              onDragLeave={() => setDragOverPos(null)}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedPos !== null && draggedPos !== pos) {
                  moveSlot(draggedPos, pos);
                }
                setDraggedPos(null);
                setDragOverPos(null);
              }}
              onDragEnd={() => {
                setDraggedPos(null);
                setDragOverPos(null);
              }}
              className={`p-5 rounded-2xl border transition-all space-y-3.5 bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 ${
                isBeingDragged ? 'opacity-40 scale-[0.99] border-dashed border-blue-400' : ''
              } ${isDragOver ? 'ring-2 ring-[#4285F4] bg-blue-50/50 dark:bg-blue-950/30' : ''}`}
            >
              {/* Top Row: Reorder Controls, Badge, Concept, Reveal Mechanism, Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Reorder Controls: Drag Handle + Up/Down Arrows */}
                  <div className="flex items-center gap-1 shrink-0">
                    <div
                      className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      title="Drag to change order"
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => moveSlot(pos, pos - 1)}
                        disabled={pos === 0}
                        className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-20 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                        title="Move up (increase countdown number)"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSlot(pos, pos + 1)}
                        disabled={pos === slots.length - 1}
                        className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-20 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                        title="Move down (decrease countdown number)"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Number Badge */}
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
                    onClick={() => (isEditing ? handleSaveEdit(slot.index) : handleStartEdit(slot))}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-colors"
                  >
                    {isEditing ? <Check className="w-3 h-3 text-[#34A853]" /> : <Edit3 className="w-3 h-3 text-slate-500" />}
                    <span>{isEditing ? 'Save Edit' : 'Edit Prompts'}</span>
                  </button>
                </div>
              </div>

              {/* Director's Reveal Vision */}
              {slot.revealMechanism && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-purple-500/10 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 text-purple-900 dark:text-purple-200 text-xs">
                  <Eye className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-purple-700 dark:text-purple-300 mr-1.5">🎬 Transition Plan:</span>
                    <span className="font-medium leading-relaxed">{slot.revealMechanism}</span>
                  </div>
                </div>
              )}

              {/* Coordinated Prompts View / Edit */}
              {isEditing ? (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3 text-[#4285F4]" />
                      <span>1. Frame 1 Start Image Prompt (Clean Establishing Shot - ZERO Numbers)</span>
                    </label>
                    <textarea
                      rows={2}
                      value={editingStartText}
                      onChange={(e) => setEditingStartText(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-[#4285F4] text-xs text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-500" />
                      <span>2. Frame N End Hero Prompt (Close-Up Hero Shot with Number '{slot.diegeticNumber}')</span>
                    </label>
                    <textarea
                      rows={2}
                      value={editingEndText}
                      onChange={(e) => setEditingEndText(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500 text-xs text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                      <Video className="w-3 h-3 text-purple-500" />
                      <span>3. Veo 3 Video Motion Transition (Glides from Frame 1 to Frame N)</span>
                    </label>
                    <textarea
                      rows={2}
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  {/* Start Image Prompt Box */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 space-y-1">
                    <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 uppercase tracking-wider">
                      <ImageIcon className="w-3 h-3" />
                      <span>Frame 1: Start (Clean)</span>
                    </div>
                    <p className="text-xs font-mono text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3 hover:line-clamp-none">
                      {slot.startImagePrompt || slot.imagePrompt}
                    </p>
                  </div>

                  {/* End Hero Image Prompt Box */}
                  <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/60 space-y-1">
                    <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 uppercase tracking-wider">
                      <Sparkles className="w-3 h-3" />
                      <span>Frame N: End (Number #{slot.diegeticNumber})</span>
                    </div>
                    <p className="text-xs font-mono text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3 hover:line-clamp-none">
                      {slot.endImagePrompt || `Hero close-up shot revealing physical countdown numeral '${slot.diegeticNumber}'`}
                    </p>
                  </div>

                  {/* Video Motion Prompt Box */}
                  <div className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/60 space-y-1">
                    <div className="text-[10px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1 uppercase tracking-wider">
                      <Video className="w-3 h-3" />
                      <span>Veo 3 Motion Transition</span>
                    </div>
                    <p className="text-xs font-mono text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3 hover:line-clamp-none">
                      {slot.videoPrompt || `Camera smoothly transitions from Frame 1 into Frame N.`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Information Footer */}
      <div className="pt-2 text-center text-xs text-slate-400 dark:text-slate-500">
        All 10 prompts are coordinated for starting image framing and dynamic Veo 3 camera reveal.
      </div>
    </div>
  );
};
