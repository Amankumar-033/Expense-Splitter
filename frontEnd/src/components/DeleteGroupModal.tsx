import { AlertTriangle, Loader2 } from 'lucide-react';

export default function DeleteGroupModal({ isOpen, onClose, onDelete, groupName, isDeleting }: any) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#131B2C] border border-rose-500/30 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
                <div className="flex flex-col items-center p-6 text-center">
                    <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-4 border border-rose-500/20">
                        <AlertTriangle className="h-8 w-8 text-rose-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Delete Group?</h3>
                    <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                        Are you sure you want to delete <span className="text-white font-semibold">{groupName}</span>? This will permanently remove the group for all members. All balances must be settled first.
                    </p>
                    <div className="flex gap-3 w-full">
                        <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm font-bold transition-colors border border-gray-700">Cancel</button>
                        <button onClick={onDelete} disabled={isDeleting} className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-rose-900/20">
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete Group'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}