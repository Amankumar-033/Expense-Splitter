import { User as UserIcon, Mail, X, Loader2 } from 'lucide-react';

export default function AddMemberModal({ 
    isOpen, 
    onClose, 
    onSubmit, 
    newMemberName, 
    setNewMemberName, 
    newMemberEmail, 
    setNewMemberEmail, 
    isAdding 
}: any) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#131B2C] border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
                <div className="flex justify-between items-center p-5 border-b border-gray-800">
                    <h3 className="text-lg font-bold text-white">Add Friend</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 p-1.5 rounded-lg transition-colors"><X className="h-4 w-4" /></button>
                </div>
                <form onSubmit={onSubmit} className="p-5 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Friend's Name</label>
                        <div className="relative">
                            <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                            <input type="text" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} placeholder="e.g. Rahul" required className="w-full pl-9 pr-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-sm text-white focus:ring-1 focus:ring-indigo-500" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                            <input type="email" value={newMemberEmail} onChange={(e) => setNewMemberEmail(e.target.value)} placeholder="rahul@example.com" required className="w-full pl-9 pr-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-sm text-white focus:ring-1 focus:ring-indigo-500" />
                        </div>
                        <p className="text-[11px] text-emerald-400/80 mt-2.5 leading-relaxed bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">Not on SmartSplit yet? No worries! Add their email to track their share.</p>
                    </div>
                    <button type="submit" disabled={isAdding} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold flex justify-center gap-2 mt-4 shadow-lg shadow-indigo-900/20 transition-all">{isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add to Group'}</button>
                </form>
            </div>
        </div>
    );
}