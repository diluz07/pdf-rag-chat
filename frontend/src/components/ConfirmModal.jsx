import React, { useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, Trash2, RotateCcw, X } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger', // 'danger' | 'warning' | 'info'
  icon: customIcon,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (onCancel) onCancel();
        else if (onConfirm) onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onConfirm, onCancel]);

  if (!isOpen) return null;

  const renderIcon = () => {
    if (customIcon) return customIcon;
    switch (type) {
      case 'danger':
        return <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-zinc-900 dark:text-white" />;
    }
  };

  const getBadgeStyle = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/60';
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60';
      case 'info':
      default:
        return 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800';
    }
  };

  const getConfirmButtonStyle = () => {
    if (type === 'danger') {
      return 'bg-red-600 hover:bg-red-700 text-white border-transparent';
    }
    return 'bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-black border-transparent';
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          if (onCancel) onCancel();
          else if (onConfirm) onConfirm();
        }
      }}
    >
      <div className="bg-white/85 dark:bg-black/60 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/15 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative transform transition-all animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={onCancel || onConfirm}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-white/80 dark:hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3.5 mb-4">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${getBadgeStyle()}`}
          >
            {renderIcon()}
          </div>
          <div className="min-w-0 pr-4">
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white tracking-tight">
              {title}
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex items-center justify-end gap-2">
          {cancelText && (
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-2xl bg-white/70 hover:bg-white text-zinc-700 dark:bg-white/10 dark:hover:bg-white/15 dark:text-zinc-200 border border-zinc-200/70 dark:border-white/10 text-xs font-semibold backdrop-blur-xs transition-all cursor-pointer"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-2xl text-xs font-semibold shadow-xs transition-all cursor-pointer ${getConfirmButtonStyle()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
