import { useState } from 'react';
import { CreditCard, CheckCircle2, ArrowRight, Loader2, Wallet } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api/axios';

const getRawId = (obj: any): string => {
    if (!obj) return "";
    if (typeof obj === "string") return obj;
    return String(obj._id || obj.id || obj);
};

export default function SettleUpSection({ settlements, rawMyId, groupId, onSettled }: any) {
    const [activeSettleTx, setActiveSettleTx] = useState<any>(null);
    const [settlingTx, setSettlingTx] = useState<string | null>(null);

    const handleSettleAPI = async (tx: any) => {
        const txKey = `${tx.from.id}-${tx.to.id}-${tx.amount}`;
        if (settlingTx) return;
        setSettlingTx(txKey);
        try {
            await api.post('/expenses/settle', {
                payerId: tx.from.id,
                receiverId: tx.to.id,
                amount: tx.amount,
                groupId: groupId
            });
            setActiveSettleTx(null);
            if (onSettled) onSettled(true);
        } catch (error) {
            alert("Settlement failed");
        } finally {
            setSettlingTx(null);
        }
    };

    return (
        <>
            <div className="bg-gradient-to-br from-[#131B2C] to-[#0f1523] border border-gray-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
                <h2 className="text-sm font-bold tracking-wide uppercase text-gray-400 mb-4 flex items-center gap-2 relative z-10">
                    <CreditCard className="h-4 w-4 text-emerald-400" /> How to Settle Up
                </h2>
                
                {settlements.length === 0 ? (
                    <div className="py-6 flex flex-col items-center justify-center text-center relative z-10 opacity-70">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2 opacity-80" />
                        <p className="text-sm text-gray-400 font-medium">All balances are settled!</p>
                    </div>
                ) : (
                    <div className="space-y-3 relative z-10">
                        {settlements.map((tx: any, index: number) => {
                            // Exclusivity Checks
                            const amIPayerForThisTx = getRawId(tx.from.id) === rawMyId;
                            const amIReceiverForThisTx = getRawId(tx.to.id) === rawMyId;

                            return (
                                <div key={index} className="flex items-center justify-between p-3.5 bg-gray-900/60 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors">
                                    <div className="flex items-center gap-2 flex-1 min-w-0 pr-4">
                                        <span className="text-sm font-medium text-rose-400 truncate max-w-[90px]" title={tx.from.name}>{tx.from.name}</span>
                                        <ArrowRight className="h-3.5 w-3.5 text-gray-600 shrink-0" />
                                        <span className="text-sm font-medium text-emerald-400 truncate max-w-[90px]" title={tx.to.name}>{tx.to.name}</span>
                                    </div>

                                    {amIPayerForThisTx ? (
                                        <button
                                            onClick={() => setActiveSettleTx(tx)}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/20 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center justify-center min-w-[75px] transition-all"
                                        >
                                            Pay ₹{tx.amount}
                                        </button>
                                    ) : amIReceiverForThisTx ? (
                                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                                            Owes You ₹{tx.amount}
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-800/50 px-3 py-1.5 rounded-lg border border-gray-700/50">
                                            ₹{tx.amount} Pending
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* REAL UPI MODAL */}
            {activeSettleTx && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#131B2C] border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center">
                            <h3 className="text-xl font-bold text-white mb-2">Settle Balance</h3>
                            <p className="text-sm text-gray-400 mb-6">
                                You are sending <span className="font-bold text-emerald-400">₹{activeSettleTx.amount}</span> to <span className="text-white font-medium">{activeSettleTx.to.name}</span>
                            </p>

                            {activeSettleTx.to.upiId ? (
                                <>
                                    <div className="bg-white p-4 rounded-xl mb-4 inline-block shadow-lg">
                                        <QRCodeSVG
                                            value={`upi://pay?pa=${activeSettleTx.to.upiId}&pn=${encodeURIComponent(activeSettleTx.to.name)}&am=${activeSettleTx.amount}&cu=INR&tn=SmartSplit`}
                                            size={200}
                                            level={"H"}
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-500 mb-2 font-medium bg-gray-800/50 py-1.5 rounded-lg border border-gray-700">Scanning UPI ID: <span className="text-gray-300">{activeSettleTx.to.upiId}</span></p>
                                    <p className="text-xs text-emerald-400/80 mb-6 px-4 bg-emerald-500/10 py-2 rounded-lg border border-emerald-500/20">
                                        Scan with GPay, PhonePe, Paytm to pay directly.
                                    </p>
                                </>
                            ) : (
                                <div className="bg-gray-800/50 p-6 rounded-xl mb-6 border border-gray-700/50 flex flex-col items-center justify-center">
                                    <div className="h-12 w-12 bg-amber-500/10 rounded-full flex items-center justify-center mb-3">
                                        <Wallet className="h-6 w-6 text-amber-400" />
                                    </div>
                                    <p className="text-sm text-gray-300 font-medium">No UPI ID Linked</p>
                                    <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                                        {activeSettleTx.to.name} hasn't linked their UPI ID yet. Please pay them manually via cash or direct transfer.
                                    </p>
                                </div>
                            )}

                            <div className="flex flex-col gap-3 w-full">
                                <button
                                    onClick={() => handleSettleAPI(activeSettleTx)}
                                    disabled={settlingTx !== null}
                                    className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-900/20"
                                >
                                    {settlingTx ? <Loader2 className="h-4 w-4 animate-spin" /> : 'I have paid, Request Approval'}
                                </button>
                                <button
                                    onClick={() => setActiveSettleTx(null)}
                                    className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm font-bold transition-colors border border-gray-700"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}