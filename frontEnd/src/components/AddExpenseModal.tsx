import { useState, useEffect, useRef } from 'react';
import { Loader2, X, Receipt, IndianRupee, Percent, CheckSquare, SplitSquareHorizontal, Camera } from 'lucide-react';
import api from '../api/axios';

const getRawId = (obj: any): string => String(obj?._id || obj?.id || obj).trim();

export default function AddExpenseModal({ isOpen, onClose, groupId, groupMembers, rawMyId, onSuccess }: any) {
    const [expenseTitle, setExpenseTitle] = useState('');
    const [expenseAmount, setExpenseAmount] = useState('');
    const [isAddingExpense, setIsAddingExpense] = useState(false);
    
    // AI Scanner States
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isScanning, setIsScanning] = useState(false);
    
    const [payerMode, setPayerMode] = useState<'SINGLE' | 'MULTIPLE'>('SINGLE');
    const [singlePayerId, setSinglePayerId] = useState('');
    const [multiplePayers, setMultiplePayers] = useState<Record<string, string>>({});
    
    const [splitType, setSplitType] = useState<'EQUAL' | 'EXACT' | 'PERCENTAGE'>('EQUAL');
    const [splitEqualInvolved, setSplitEqualInvolved] = useState<string[]>([]);
    const [splitExact, setSplitExact] = useState<Record<string, string>>({});
    const [splitPercentage, setSplitPercentage] = useState<Record<string, string>>({});

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setExpenseTitle('');
            setExpenseAmount('');
            setPayerMode('SINGLE');
            setSplitType('EQUAL');
            setSinglePayerId(rawMyId || getRawId(groupMembers[0]));

            const initMulti: Record<string, string> = {};
            const initExact: Record<string, string> = {};
            const initPct: Record<string, string> = {};
            const initEq: string[] = [];

            groupMembers.forEach((m: any) => {
                const mId = getRawId(m);
                initMulti[mId] = '';
                initExact[mId] = '';
                initPct[mId] = '';
                initEq.push(mId);
            });

            setMultiplePayers(initMulti);
            setSplitExact(initExact);
            setSplitPercentage(initPct);
            setSplitEqualInvolved(initEq);
        }
    }, [isOpen, groupMembers, rawMyId]);

    if (!isOpen) return null;

    const totalExpNum = Number(expenseAmount) || 0;
    const currentMultiPaySum = Object.values(multiplePayers).reduce((acc, v) => acc + Number(v || 0), 0);
    const currentExactSplitSum = Object.values(splitExact).reduce((acc, v) => acc + Number(v || 0), 0);
    const currentPctSum = Object.values(splitPercentage).reduce((acc, v) => acc + Number(v || 0), 0);

    const isSaveDisabled = isAddingExpense || !expenseTitle || totalExpNum <= 0 ||
        (payerMode === 'MULTIPLE' && Math.abs(currentMultiPaySum - totalExpNum) > 0.01) ||
        (splitType === 'EQUAL' && splitEqualInvolved.length === 0) ||
        (splitType === 'EXACT' && Math.abs(currentExactSplitSum - totalExpNum) > 0.01) ||
        (splitType === 'PERCENTAGE' && Math.abs(currentPctSum - 100) > 0.01);

    // 🔥 THE NEW AI HANDLER 🔥
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('receipt', file);

        setIsScanning(true);
        try {
            const res = await api.post('/expenses/parse-receipt', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            // AI ne jo bola usko form mein bhar do!
            if (res.data.title) setExpenseTitle(res.data.title);
            if (res.data.amount) setExpenseAmount(res.data.amount.toString());
            
        } catch (error) {
            alert("AI couldn't read the image clearly. Please enter manually.");
        } finally {
            setIsScanning(false);
            if (fileInputRef.current) fileInputRef.current.value = ''; // Clean input
        }
    };

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaveDisabled) return;

        let finalPayers: any = [];
        let finalSplits: any = [];

        if (payerMode === 'SINGLE') {
            finalPayers = [{ user: singlePayerId, amount: totalExpNum }];
        } else {
            finalPayers = Object.entries(multiplePayers)
                .filter(([_, amt]) => Number(amt) > 0)
                .map(([id, amt]) => ({ user: id, amount: Number(amt) }));
        }

        if (splitType === 'EQUAL') {
            finalSplits = splitEqualInvolved.map(id => ({ user: id })); 
        } else if (splitType === 'EXACT') {
            finalSplits = Object.entries(splitExact)
                .filter(([_, amt]) => Number(amt) > 0)
                .map(([id, amt]) => ({ user: id, amountOwed: Number(amt) }));
        } else if (splitType === 'PERCENTAGE') {
            finalSplits = Object.entries(splitPercentage)
                .filter(([_, pct]) => Number(pct) > 0)
                .map(([id, pct]) => ({ user: id, amountOwed: (totalExpNum * Number(pct)) / 100 }));
        }

        setIsAddingExpense(true);
        try {
            await api.post('/expenses/add', {
                title: expenseTitle,
                totalAmount: totalExpNum,
                groupId,
                payers: finalPayers,
                splits: finalSplits,
                splitType
            });
            onSuccess(); // Close modal and refresh data
        } catch (error: any) { 
            alert(error.response?.data?.message || 'Failed to save expense'); 
        } finally { 
            setIsAddingExpense(false); 
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-10 bg-black/70 backdrop-blur-sm">
            <div className="bg-[#131B2C] border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
                <div className="flex justify-between items-center p-5 border-b border-gray-800 bg-[#131B2C] sticky top-0 z-10">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-indigo-400" /> Add New Expense
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 p-1.5 rounded-lg transition-colors"><X className="h-5 w-5" /></button>
                </div>
                
                <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                    
                    {/* 🔥 THE NEW AI SCANNER BUTTON 🔥 */}
                    <div className="mb-2">
                        <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            ref={fileInputRef} 
                            onChange={handleFileUpload} 
                        />
                        <button 
                            type="button" 
                            onClick={() => fileInputRef.current?.click()} 
                            disabled={isScanning}
                            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 rounded-xl flex items-center justify-center gap-3 text-emerald-400 font-bold transition-all disabled:opacity-50"
                        >
                            {isScanning ? (
                                <><Loader2 className="h-5 w-5 animate-spin" /> Analyzing Receipt...</>
                            ) : (
                                <><Camera className="h-5 w-5" /> Auto-fill with Receipt Photo</>
                            )}
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">What was it for?</label>
                            <input type="text" value={expenseTitle} onChange={(e) => setExpenseTitle(e.target.value)} placeholder="e.g. Domino's Pizza" className="w-full px-4 py-2.5 bg-gray-900/50 border border-gray-700 rounded-xl text-sm text-white focus:ring-1 focus:ring-indigo-500 transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Total Amount (₹)</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><IndianRupee className="h-5 w-5 text-gray-500" /></div>
                                <input type="number" min="1" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} placeholder="0.00" className="w-full pl-11 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-xl font-bold text-white focus:ring-1 focus:ring-indigo-500 transition-all" />
                            </div>
                        </div>
                    </div>

                    <hr className="border-gray-800" />

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide">Who Paid?</label>
                            <div className="flex bg-gray-800 p-1 rounded-lg">
                                <button onClick={() => setPayerMode('SINGLE')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${payerMode === 'SINGLE' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>Single</button>
                                <button onClick={() => setPayerMode('MULTIPLE')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${payerMode === 'MULTIPLE' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>Multiple</button>
                            </div>
                        </div>
                        
                        {payerMode === 'SINGLE' ? (
                            <select value={singlePayerId} onChange={(e) => setSinglePayerId(e.target.value)} className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-sm font-semibold text-white focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer">
                                {groupMembers.map((m: any) => <option key={m._id} value={m._id}>{m.name} {getRawId(m) === rawMyId ? '(You)' : ''}</option>)}
                            </select>
                        ) : (
                            <div className="space-y-2 bg-gray-900/30 p-3 rounded-xl border border-gray-800">
                                {groupMembers.map((m: any) => (
                                    <div key={m._id} className="flex items-center justify-between gap-3">
                                        <span className="text-sm font-medium text-gray-300 truncate">{m.name}</span>
                                        <div className="relative w-32 shrink-0">
                                            <span className="absolute left-3 top-2 text-gray-500 text-xs">₹</span>
                                            <input type="number" placeholder="0" value={multiplePayers[m._id] || ''} onChange={(e) => setMultiplePayers(prev => ({...prev, [m._id]: e.target.value}))} className="w-full pl-7 pr-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:ring-1 focus:ring-indigo-500" />
                                        </div>
                                    </div>
                                ))}
                                <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-800 text-xs font-bold">
                                    <span className="text-gray-400">Total Paid</span>
                                    <span className={Math.abs(currentMultiPaySum - totalExpNum) < 0.01 ? "text-emerald-400" : "text-rose-400"}>₹{currentMultiPaySum} / ₹{totalExpNum}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <hr className="border-gray-800" />

                    <div className="space-y-4 pb-2">
                        <div className="flex flex-col gap-3">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide">How to split?</label>
                            <div className="grid grid-cols-3 gap-2 bg-gray-800 p-1 rounded-xl">
                                <button onClick={() => setSplitType('EQUAL')} className={`py-1.5 flex justify-center items-center gap-1.5 text-xs font-bold rounded-lg transition-all ${splitType === 'EQUAL' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}><CheckSquare className="h-3.5 w-3.5"/> Equal</button>
                                <button onClick={() => setSplitType('EXACT')} className={`py-1.5 flex justify-center items-center gap-1.5 text-xs font-bold rounded-lg transition-all ${splitType === 'EXACT' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}><SplitSquareHorizontal className="h-3.5 w-3.5"/> Exact</button>
                                <button onClick={() => setSplitType('PERCENTAGE')} className={`py-1.5 flex justify-center items-center gap-1.5 text-xs font-bold rounded-lg transition-all ${splitType === 'PERCENTAGE' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}><Percent className="h-3.5 w-3.5"/> Percent</button>
                            </div>
                        </div>

                        {splitType === 'EQUAL' && (
                            <div className="space-y-2 bg-gray-900/30 p-3 rounded-xl border border-gray-800">
                                <p className="text-xs text-gray-500 mb-2">Select who is involved in this expense.</p>
                                {groupMembers.map((m: any) => (
                                    <label key={m._id} className="flex items-center gap-3 cursor-pointer p-1.5 hover:bg-gray-800/50 rounded-lg">
                                        <input type="checkbox" checked={splitEqualInvolved.includes(m._id)} onChange={(e) => {
                                            if (e.target.checked) setSplitEqualInvolved([...splitEqualInvolved, m._id]);
                                            else setSplitEqualInvolved(splitEqualInvolved.filter(id => id !== m._id));
                                        }} className="w-4 h-4 rounded text-indigo-600 bg-gray-800 border-gray-700 focus:ring-indigo-600 focus:ring-offset-gray-900" />
                                        <span className="text-sm text-gray-300 font-medium">{m.name}</span>
                                    </label>
                                ))}
                                <div className="mt-2 pt-2 border-t border-gray-800 text-xs text-center font-bold text-indigo-400">
                                    ₹{(totalExpNum / (splitEqualInvolved.length || 1)).toFixed(2)} / person
                                </div>
                            </div>
                        )}

                        {splitType === 'EXACT' && (
                            <div className="space-y-2 bg-gray-900/30 p-3 rounded-xl border border-gray-800">
                                {groupMembers.map((m: any) => (
                                    <div key={m._id} className="flex items-center justify-between gap-3">
                                        <span className="text-sm font-medium text-gray-300 truncate">{m.name}</span>
                                        <div className="relative w-32 shrink-0">
                                            <span className="absolute left-3 top-2 text-gray-500 text-xs">₹</span>
                                            <input type="number" placeholder="0" value={splitExact[m._id] || ''} onChange={(e) => setSplitExact(prev => ({...prev, [m._id]: e.target.value}))} className="w-full pl-7 pr-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:ring-1 focus:ring-indigo-500" />
                                        </div>
                                    </div>
                                ))}
                                <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-800 text-xs font-bold">
                                    <span className="text-gray-400">Split Total</span>
                                    <span className={Math.abs(currentExactSplitSum - totalExpNum) < 0.01 ? "text-emerald-400" : "text-rose-400"}>₹{currentExactSplitSum} / ₹{totalExpNum}</span>
                                </div>
                            </div>
                        )}

                        {splitType === 'PERCENTAGE' && (
                            <div className="space-y-2 bg-gray-900/30 p-3 rounded-xl border border-gray-800">
                                {groupMembers.map((m: any) => (
                                    <div key={m._id} className="flex items-center justify-between gap-3">
                                        <span className="text-sm font-medium text-gray-300 truncate">{m.name} <span className="text-gray-500 text-[10px] ml-1">(₹{((totalExpNum * Number(splitPercentage[m._id] || 0)) / 100).toFixed(0)})</span></span>
                                        <div className="relative w-32 shrink-0">
                                            <span className="absolute right-3 top-2 text-gray-500 text-xs">%</span>
                                            <input type="number" placeholder="0" value={splitPercentage[m._id] || ''} onChange={(e) => setSplitPercentage(prev => ({...prev, [m._id]: e.target.value}))} className="w-full pl-3 pr-7 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:ring-1 focus:ring-indigo-500" />
                                        </div>
                                    </div>
                                ))}
                                <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-800 text-xs font-bold">
                                    <span className="text-gray-400">Total Percentage</span>
                                    <span className={Math.abs(currentPctSum - 100) < 0.01 ? "text-emerald-400" : "text-rose-400"}>{currentPctSum}% / 100%</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-5 border-t border-gray-800 bg-[#131B2C] sticky bottom-0 z-10">
                    <button onClick={handleAddExpense} disabled={isSaveDisabled} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex justify-center items-center gap-2 shadow-lg shadow-indigo-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        {isAddingExpense ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Expense'}
                    </button>
                    {isSaveDisabled && totalExpNum > 0 && !isAddingExpense && (
                        <p className="text-[10px] text-rose-400 text-center mt-2 font-medium">Please check math! Amounts/Percentages must match exactly.</p>
                    )}
                </div>
            </div>
        </div>
    );
}