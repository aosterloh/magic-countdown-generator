import React, { useState } from 'react';
import { X, Upload, Sparkles, RefreshCw } from 'lucide-react';
import { CountdownSlot } from '../types';
import { getMediaUrl } from '../utils/media';

interface RefineModalProps {
  slot: CountdownSlot;
  brandName: string;
  onClose: () => void;
  onRefine: (slotIndex: number, customPrompt: string, brandRefFile?: File) => Promise<void>;
}

export const RefineModal: React.FC<RefineModalProps> = ({
  slot,
  brandName,
  onClose,
  onRefine,
}) => {
  const [customPrompt, setCustomPrompt] = useState(slot.imagePrompt);
  const [brandRefFile, setBrandRefFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBrandRefFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onRefine(slot.index, customPrompt, brandRefFile || undefined);
      onClose();
    } catch (err) {
      console.error('Failed to refine shot:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-md bg-cyan-500/20 text-cyan-400 font-mono font-bold text-sm border border-cyan-500/30">
              Shot #{slot.index}
            </span>
            <h3 className="text-base font-bold text-white">
              Refine Diegetic Shot #{slot.index}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Dual Image Comparison Layout */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Current Image (Target for Fix)
              </label>
              <div className="aspect-video rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center relative">
                {slot.currentImageUri ? (
                  <img
                    src={getMediaUrl(slot.currentImageUri)}
                    alt={`Shot ${slot.index}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-xs text-slate-500">No Image Generated</div>
                )}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] text-slate-300 font-mono">
                  Current Shot
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                2nd Reference Image (Brand Product / Logo)
              </label>
              <div className="aspect-video rounded-xl bg-slate-950 border border-dashed border-slate-700 hover:border-cyan-500/50 transition-colors overflow-hidden flex flex-col items-center justify-center relative group p-2">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Brand Reference"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full text-center">
                    <Upload className="w-6 h-6 text-cyan-400 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-medium text-slate-300">
                      Upload Brand Asset
                    </span>
                    <span className="text-[10px] text-slate-500">
                      e.g. Car, Aircraft, Laptop
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
                {previewUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setBrandRefFile(null);
                      setPreviewUrl(null);
                    }}
                    className="absolute top-2 right-2 p-1 rounded-md bg-red-900/80 text-red-200 text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Manual Prompt Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Custom Prompt & Diegetic Number Instructions
            </label>
            <textarea
              rows={3}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              placeholder={`Describe the scene and how number "${slot.index}" is physically embedded...`}
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Ensure number "{slot.index}" remains an authentic physical element inside the environment.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white shadow-lg shadow-cyan-600/20 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Re-rendering Shot...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Re-render Shot #{slot.index}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
