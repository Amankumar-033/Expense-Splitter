import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Loader2, Receipt, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { io } from 'socket.io-client';

// Humare naye chhote-chhote components!
import SettleUpSection from '../components/SettleUpSection';
import AddMemberModal from '../components/AddMemberModal';
import DeleteGroupModal from '../components/DeleteGroupModal';
import AddExpenseModal from '../components/AddExpenseModal';
import GroupLedger from '../components/GroupLedger';

const getRawId = (obj: any): string => String(obj?._id || obj?.id || obj).trim();

export default function GroupDetails() {
    const { groupId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth(); 

    const [myProfile, setMyProfile] = useState<any>(null);
    const [group, setGroup] = useState<any>(null);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [settlements, setSettlements] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    
    // Modal states
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false); 
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    
    const [newMemberName, setNewMemberName] = useState('');
    const [newMemberEmail, setNewMemberEmail] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false); 
    const socketRef = useRef<any>(null);

    const fetchGroupData = useCallback(async (silent = false) => {
        if (!silent) setIsLoading(true);
        else setIsSyncing(true);

        try {
            const [profileRes, groupsRes, expensesRes, settlementsRes] = await Promise.all([
                api.get('/auth/profile'),
                api.get('/groups/my-groups'),
                api.get(`/expenses/group/${groupId}`),
                api.get(`/expenses/group/${groupId}/settle-plan`)
            ]);
            
            setMyProfile(profileRes.data);
            const currentGroup = groupsRes.data.groups.find((g: any) => getRawId(g) === groupId);
            setGroup(currentGroup);
            setExpenses(expensesRes.data.expenses || []);
            setSettlements(settlementsRes.data.settlements || []);
        } catch (error) {
            console.error("Failed to fetch", error);
            if (!silent) navigate('/dashboard');
        } finally {
            setIsLoading(false);
            setIsSyncing(false);
        }
    }, [groupId, navigate]);

    useEffect(() => { 
        fetchGroupData(); 
        
        socketRef.current = io('http://localhost:5000');
        if (groupId) {
            socketRef.current.emit('join_group', groupId);
            socketRef.current.on('group_data_changed', () => fetchGroupData(true));
        }

        const onFocus = () => fetchGroupData(true);
        window.addEventListener('focus', onFocus);
        
        return () => {
            window.removeEventListener('focus', onFocus);
            if (socketRef.current && groupId) {
                socketRef.current.emit('leave_group', groupId);
                socketRef.current.disconnect();
            }
        };
    }, [groupId, fetchGroupData]);

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAdding(true);
        try {
            await api.put(`/groups/${groupId}/add-member`, { name: newMemberName, email: newMemberEmail });
            setNewMemberName(''); setNewMemberEmail(''); setIsAddMemberOpen(false);
        } catch (error: any) { alert(error.response?.data?.message || 'Failed'); }
        finally { setIsAdding(false); }
    };

    const handleDeleteGroup = async () => {
        setIsDeleting(true);
        try {
            await api.delete(`/groups/${groupId}`);
            navigate('/dashboard', { replace: true });
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to delete group');
            setIsDeleteModalOpen(false);
        } finally {
            setIsDeleting(false);
        }
    };

    if (isLoading || !myProfile) return <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center"><Loader2 className="h-8 w-8 text-indigo-500 animate-spin" /></div>;
    if (!group) return <div className="text-white text-center mt-20">Group not found.</div>;

    const rawMyId = getRawId(myProfile) || getRawId(user);
    const rawCreatorId = getRawId(group.createdBy);
    const isCreator = (rawCreatorId === rawMyId) || (group.createdBy?.email === myProfile?.email) || (group.members?.length === 1); 

    return (
        <div className="min-h-screen bg-[#0B0F19] text-white font-sans pb-10 selection:bg-indigo-500/30">
            {/* Navbar */}
            <div className="bg-[#131B2C]/90 backdrop-blur-md border-b border-gray-800 sticky top-0 z-30 shadow-lg">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/dashboard')} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors"><ArrowLeft className="h-5 w-5 text-gray-300" /></button>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">{group.name}</h1>
                            <p className="text-xs text-gray-400 font-medium mt-0.5">{group.members.length} members</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => {
                                if (!isCreator) return alert("Only the creator of this group can delete it.");
                                setIsDeleteModalOpen(true);
                            }}
                            className={`p-2.5 rounded-lg transition-colors border ${isCreator ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-transparent hover:border-rose-500/30 shadow-md' : 'bg-gray-800/30 text-gray-600 border-gray-800/50 cursor-not-allowed opacity-50'}`}
                        >
                            <Trash2 className="h-5 w-5" />
                        </button>
                        <button onClick={() => setIsExpenseModalOpen(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-bold shadow-md shadow-indigo-900/20 transition-all flex items-center">
                            <Receipt className="inline mr-2 h-4 w-4" /> Add Expense
                        </button>
                    </div>
                </div>
            </div>

            <main className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT COLUMN */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Members List */}
                    <div className="bg-[#131B2C] border border-gray-800 rounded-2xl p-5 shadow-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-sm font-bold tracking-wide uppercase text-gray-400 flex items-center gap-2"><Users className="h-4 w-4 text-indigo-400" /> Members</h2>
                            <button onClick={() => setIsAddMemberOpen(true)} className="text-xs font-semibold bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 px-2.5 py-1.5 rounded-lg transition-colors">+ Add</button>
                        </div>
                        <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                            {group.members.map((member: any) => {
                                const isMe = getRawId(member) === rawMyId;
                                return (
                                    <div key={member._id} className={`flex items-center gap-3 p-2.5 rounded-xl transition-all border ${isMe ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-gray-800/30 border-transparent hover:border-gray-700'}`}>
                                        <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold shadow-inner border border-gray-700">{member.name.charAt(0).toUpperCase()}</div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-semibold text-gray-200 truncate">{member.name} {isMe && <span className="text-indigo-400 ml-1 text-xs">(You)</span>}</span>
                                            <span className="text-[10px] text-gray-500 truncate">{member.email}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <SettleUpSection settlements={settlements} rawMyId={rawMyId} groupId={groupId} onSettled={() => fetchGroupData(true)} />
                </div>

                {/* RIGHT COLUMN */}
                <div className="lg:col-span-2">
                    <GroupLedger expenses={expenses} rawMyId={rawMyId} isSyncing={isSyncing} onRefresh={() => fetchGroupData(true)} />
                </div>
            </main>

            {/* MODALS */}
            <AddMemberModal isOpen={isAddMemberOpen} onClose={() => setIsAddMemberOpen(false)} onSubmit={handleAddMember} newMemberName={newMemberName} setNewMemberName={setNewMemberName} newMemberEmail={newMemberEmail} setNewMemberEmail={setNewMemberEmail} isAdding={isAdding} />
            <DeleteGroupModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onDelete={handleDeleteGroup} groupName={group.name} isDeleting={isDeleting} />
            <AddExpenseModal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} groupId={groupId} groupMembers={group.members} rawMyId={rawMyId} onSuccess={() => { setIsExpenseModalOpen(false); fetchGroupData(true); }} />
        </div>
    );
}