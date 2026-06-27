import { useState } from 'react';
import { Clock, X, CheckCircle2, Receipt, ChevronDown, ChevronUp, Check, RefreshCw } from 'lucide-react';
import api from '../api/axios';

const getRawId = (obj: any): string => String(obj?._id || obj?.id || obj).trim();

const formatDateTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
};

const formatMoney = (amount: number) => {
    return Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

export default function GroupLedger({ expenses, rawMyId, isSyncing, onRefresh }: any) {
    const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);
    const [visibleLedgerCount, setVisibleLedgerCount] = useState(4);
    
    const visibleExpenses = expenses.slice(0, visibleLedgerCount);

    const handleApproveSettlement = async (settlementId: string) => {
        try {
            await api.put(`/expenses/${settlementId}/approve`);
        } catch (error) { alert("Failed to approve"); }
    };

    const handleRejectSettlement = async (settlementId: string) => {
        try {
            await api.put(`/expenses/${settlementId}/reject`);
        } catch (error) { alert("Failed to reject"); }
    };

    return (
        <div className="bg-[#131B2C] border border-gray-800 rounded-2xl flex flex-col shadow-xl h-full">
            <div className="p-5 border-b border-gray-800 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-indigo-400" />
                    Group Ledger
                </h2>
                <div className="flex items-center gap-3">
                    <button onClick={onRefresh} className="text-gray-400 hover:text-indigo-400 transition-colors" title="Force Sync Data">
                        <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin text-indigo-400' : ''}`} />
                    </button>
                    <span className="text-xs font-medium text-gray-500 bg-gray-800/50 px-2.5 py-1 rounded-lg border border-gray-700">{expenses.length} Total</span>
                </div>
            </div>
            
            <div className="p-5 flex-1">
                {expenses.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-20 opacity-60">
                        <Receipt className="h-12 w-12 text-gray-600 mb-4" />
                        <p className="text-gray-300 font-medium">No expenses added yet.</p>
                        <p className="text-sm text-gray-500 mt-1">Click 'Add Expense' to start tracking your group's spending.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {visibleExpenses.map((exp: any) => {
                            const isExpanded = expandedExpenseId === exp._id;
                            const isSettlement = exp.category === 'SETTLEMENT';
                            const isPending = isSettlement && exp.settlementStatus === 'PENDING';
                            const isRejected = isSettlement && exp.settlementStatus === 'REJECTED';
                            
                            const receiverId = getRawId(exp.splits[0]?.user);
                            const amIReceiver = receiverId === rawMyId;
                            
                            return (
                                <div 
                                    key={exp._id} 
                                    onClick={() => { if (!isSettlement) setExpandedExpenseId(isExpanded ? null : exp._id); }}
                                    className={`group rounded-xl border transition-all duration-200 
                                        ${!isSettlement && 'cursor-pointer hover:border-gray-600'} 
                                        ${isPending ? 'bg-amber-900/10 border-amber-900/30' : 
                                          isSettlement && !isRejected ? 'bg-emerald-900/10 border-emerald-900/30' : 
                                          isRejected ? 'bg-rose-900/10 border-rose-900/30 opacity-70' :
                                          'bg-gray-800/30 border-gray-800/50 hover:bg-gray-800/40 shadow-sm'}
                                    `}
                                >
                                    <div className="flex justify-between items-center p-4">
                                        <div className="flex items-start sm:items-center gap-4">
                                            {isPending ? (
                                                <div className="p-3.5 rounded-xl border bg-amber-500/10 border-amber-500/30 shadow-inner flex shrink-0"><Clock className="h-5 w-5 text-amber-400" /></div>
                                            ) : isRejected ? (
                                                <div className="p-3.5 rounded-xl border bg-rose-500/10 border-rose-500/30 shadow-inner flex shrink-0"><X className="h-5 w-5 text-rose-400" /></div>
                                            ) : isSettlement ? (
                                                <div className="p-3.5 rounded-xl border bg-emerald-500/10 border-emerald-500/30 shadow-inner flex shrink-0"><CheckCircle2 className="h-5 w-5 text-emerald-400" /></div>
                                            ) : (
                                                <div className="p-3.5 rounded-xl border bg-indigo-500/10 border-indigo-500/20 shadow-inner flex shrink-0"><Receipt className="h-5 w-5 text-indigo-400" /></div>
                                            )}
                                            
                                            <div className="flex flex-col justify-center gap-0.5">
                                                <h3 className={`font-bold text-sm sm:text-base leading-tight 
                                                    ${isPending ? 'text-amber-400' : isRejected ? 'text-rose-400' : isSettlement ? 'text-emerald-400' : 'text-gray-200'}`}
                                                >
                                                    {isPending ? 'Settlement Pending' : isRejected ? 'Settlement Rejected' : isSettlement ? 'Settlement Completed' : exp.title}
                                                </h3>
                                                
                                                <div>
                                                    {isSettlement ? (
                                                        <div className="flex items-center flex-wrap gap-1.5 text-xs text-gray-400 mt-0.5">
                                                            <span className="font-semibold text-gray-300">{exp.payers[0]?.user?.name || 'Unknown'}</span> 
                                                            <span className="opacity-70">sent to</span> 
                                                            <span className="font-semibold text-gray-300">{exp.splits[0]?.user?.name || 'Unknown'}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center flex-wrap gap-1.5 text-xs text-gray-400 group-hover:text-gray-300 transition-colors mt-0.5">
                                                            <span>Paid by</span>
                                                            {exp.payers.length > 1 ? (
                                                                <span className="font-semibold text-indigo-300">{exp.payers.length} people</span>
                                                            ) : (
                                                                <span className="font-semibold text-gray-300">{exp.payers[0]?.user?.name || 'Unknown'}</span>
                                                            )}
                                                            {!isExpanded && <span className="text-[9px] text-gray-500 ml-1 uppercase tracking-wider font-bold opacity-60">• Tap to view</span>}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1.5 mt-1.5 text-[10px] font-medium text-gray-500 bg-gray-900/50 w-fit px-2 py-0.5 rounded-md border border-gray-800/80">
                                                    <Clock className="h-3 w-3 opacity-70" />
                                                    <span>{formatDateTime(exp.createdAt || exp.date)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-3 shrink-0">
                                            {isPending && amIReceiver ? (
                                                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                                                    <button onClick={(e) => { e.stopPropagation(); handleRejectSettlement(exp._id); }} className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/20 transition-colors"><X className="h-4 w-4" /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleApproveSettlement(exp._id); }} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-md transition-colors flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Approve</button>
                                                </div>
                                            ) : isPending && !amIReceiver ? (
                                                <div className="flex items-center mt-2 sm:mt-0">
                                                    <p className="text-[10px] font-bold text-amber-500/80 uppercase tracking-wider bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">Waiting for {exp.splits[0]?.user?.name}</p>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3">
                                                    <div className="text-right">
                                                        <p className={`font-black text-base sm:text-lg leading-none ${isPending ? 'text-amber-400' : isRejected ? 'text-rose-400 line-through' : isSettlement ? 'text-emerald-400' : 'text-gray-100'}`}>
                                                            ₹{formatMoney(exp.totalAmount)}
                                                        </p>
                                                        {isPending && !amIReceiver ? <p className="text-[9px] font-bold text-amber-500/80 uppercase tracking-wider mt-1">Waiting...</p> : <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-1">Total</p>}
                                                    </div>
                                                    <div className="w-5 flex justify-center items-center">
                                                        {!isSettlement && <div className="text-gray-600 group-hover:text-gray-400 transition-colors">{isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}</div>}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {isExpanded && !isSettlement && (
                                        <div className="px-5 pb-5 pt-2 border-t border-gray-800/60 bg-gray-900/20 rounded-b-xl animate-in slide-in-from-top-2 duration-200">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-3">
                                                <div>
                                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">Paid By</p>
                                                    <div className="space-y-2">
                                                        {exp.payers.map((p: any, idx: number) => (
                                                            <div key={idx} className="flex justify-between items-center bg-gray-800/30 p-2 rounded-lg border border-gray-800/50">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="h-5 w-5 rounded-full bg-emerald-900/40 border border-emerald-800/50 flex items-center justify-center text-[9px] font-bold text-emerald-400">{p.user?.name?.charAt(0).toUpperCase() || '?'}</div>
                                                                    <span className="text-xs font-medium text-gray-300">{p.user?.name || 'Unknown'}</span>
                                                                </div>
                                                                <span className="text-xs font-bold text-emerald-400">₹{formatMoney(p.amount)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">Split Details</p>
                                                    <div className="space-y-2">
                                                        {exp.splits.map((s: any, idx: number) => (
                                                            <div key={idx} className="flex justify-between items-center bg-gray-800/30 p-2 rounded-lg border border-gray-800/50">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="h-5 w-5 rounded-full bg-rose-900/40 border border-rose-800/50 flex items-center justify-center text-[9px] font-bold text-rose-400">{s.user?.name?.charAt(0).toUpperCase() || '?'}</div>
                                                                    <span className="text-xs font-medium text-gray-300">{s.user?.name || 'Unknown'}</span>
                                                                </div>
                                                                <span className="text-xs font-bold text-rose-400">₹{formatMoney(s.amountOwed)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {expenses.length > visibleLedgerCount && <button onClick={() => setVisibleLedgerCount(prev => prev + 5)} className="w-full py-3 mt-4 bg-gray-800/40 hover:bg-gray-800 text-gray-300 rounded-xl text-sm font-semibold transition-colors border border-gray-700/50 hover:border-gray-600 shadow-sm">Load More Activity...</button>}
                        {expenses.length > 4 && visibleLedgerCount >= expenses.length && <button onClick={() => setVisibleLedgerCount(4)} className="w-full py-3 mt-2 text-gray-500 hover:text-gray-300 text-sm font-medium transition-colors">Collapse Ledger ↑</button>}
                    </div>
                )}
            </div>
        </div>
    );
}