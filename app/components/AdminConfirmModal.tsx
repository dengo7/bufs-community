'use client';

import { AlertTriangle } from 'lucide-react';

interface Props {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function AdminConfirmModal({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  loading = false,
}: Props) {
  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={!loading ? onCancel : undefined} />
      <div className="relative bg-white rounded-2xl w-full max-w-[320px] p-6 shadow-xl">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <AlertTriangle size={24} strokeWidth={2} className="text-red-500" />
          </div>
          <h2 className="text-[16px] font-bold text-[#1A1A1A]">{title}</h2>
          <p className="text-[13px] text-gray-500 leading-relaxed">{description}</p>
          <div className="flex gap-2 w-full mt-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-300 rounded-2xl bg-transparent cursor-pointer hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 rounded-2xl border-none cursor-pointer hover:bg-red-600 disabled:opacity-40 transition-colors"
            >
              {loading ? '처리 중...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
