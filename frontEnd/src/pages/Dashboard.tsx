import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, PlusCircle, Users, TrendingUp, TrendingDown, Wallet, Loader2, ChevronRight, Activity, X, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { io } from 'socket.io-client';

interface Group {
    _id: string;
    name: string;
    description?: string;
    members: any[];
}

interface DashboardSummary {
    totalOwesYou: number;
    totalYouOwe: number;
    netBalance: number;
}

interface FriendBalance {
    id: string;
    name: string;
    amount: number;
}

export default function Dashboard() {
    const { user, logout } = useAuth(); 
    const navigate = useNavigate();

    const [profile, setProfile] = useState<{name: string, email: string, upiId?: string} | null>(null);
    const [groups, setGroups] = useState<Group[]>([]);
    const [summary, setSummary] = useState<DashboardSummary>({ totalOwesYou: 0, totalYouOwe: 0, netBalance: 0 });
    const [friendBalances, setFriendBalances] = useState<FriendBalance[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDesc, setNewGroupDesc] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState('');

    // 🔥 PROFILE & UPI STATES 🔥
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [upiIdInput, setUpiIdInput] = useState('');
    const [isUpdatingUpi, setIsUpdatingUpi] = useState(false);

    const socketRef = useRef<any>(null);

    const fetchDashboardData = async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const [profileRes, groupsRes, dashboardRes] = await Promise.all([
                api.get('/auth/profile'),
                api.get('/groups/my-groups'),
                api.get('/expenses/dashboard')
            ]);

            setProfile(profileRes.data);
            setUpiIdInput(profileRes.data.upiId || ''); // Set initial UPI ID
            setGroups(groupsRes.data.groups || []);
            setSummary(dashboardRes.data.summary || { totalOwesYou: 0, totalYouOwe: 0, netBalance: 0 });
            setFriendBalances(dashboardRes.data.friendBalances || []);
        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();

        socketRef.current = io('http://localhost:5000'); 

        const userId = user?._id || (user as any)?.id;
        if (userId) {
            socketRef.current.emit('join_user_room', String(userId));
            
            socketRef.current.on('dashboard_update', () => {
                fetchDashboardData(true); 
            });
        }

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [user]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGroupName.trim()) return;

        setIsCreating(true);
        setCreateError('');

        try {
            const response = await api.post('/groups/create', {
                name: newGroupName,
                description: newGroupDesc
            });

            setGroups([response.data.group, ...groups]);
            setIsModalOpen(false);
            setNewGroupName('');
            setNewGroupDesc('');
        } catch (error: any) {
            setCreateError(error.response?.data?.message || 'Failed to create group');
        } finally {
            setIsCreating(false);
        }
    };

    // 🔥 HANDLE UPI UPDATE 🔥
    const handleUpdateUPI = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUpdatingUpi(true);
        try {
            await api.put('/auth/update-upi', { upiId: upiIdInput });
            setProfile(prev => prev ? { ...prev, upiId: upiIdInput } : null);
            setIsProfileModalOpen(false);
        } catch (error: any) {
            alert(error.response?.data?.message || "Failed to update UPI ID");
        } finally {
            setIsUpdatingUpi(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
                    <p className="text-gray-400 text-sm font-medium tracking-wide">Syncing your ledger...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0B0F19] text-white font-sans selection:bg-emerald-500/30">
            <nav className="bg-[#0B0F19]/80 backdrop-blur-xl border-b border-gray-800/60 px-6 py-4 sticky top-0 z-40 transition-all">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="bg-gradient-to-br from-emerald-400 to-teal-500 p-2 rounded-xl">
                            <Activity className="h-5 w-5 text-white" />
                        </div>
                        <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-400 tracking-tight">
                            SmartSplit
                        </h1>
                    </div>
                    
                    <div className="flex items-center gap-4 sm:gap-6">
                        <div 
                            onClick={() => setIsProfileModalOpen(true)}
                            className="hidden md:flex items-center gap-3 bg-gray-800/50 py-1.5 px-3 rounded-full border border-gray-700/50 shadow-inner cursor-pointer hover:bg-gray-800 transition-colors"
                            title="Profile Settings"
                        >
                            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-sm font-bold shadow-lg">
                                {profile?.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <span className="text-sm font-semibold text-gray-200">
                                Hi, {profile?.name?.split(' ')[0] || 'User'}
                            </span>
                            <Settings className="h-4 w-4 text-gray-400 ml-1" />
                        </div>

                        <button 
                            onClick={handleLogout}
                            className="flex items-center gap-2 text-gray-400 hover:text-rose-400 transition-colors duration-200 text-sm font-medium group"
                        >
                            <LogOut className="h-5 w-5 group-hover:scale-110 transition-transform" />
                            <span className="hidden sm:inline">Logout</span>
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto px-4 py-10 space-y-10 relative z-10">
                <div>
                    <h2 className="text-lg font-semibold text-gray-400 mb-4 tracking-wide uppercase text-xs">Overview</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        
                        <div className="bg-[#131B2C] border border-gray-800 rounded-2xl p-6 shadow-xl hover:-translate-y-1 hover:shadow-2xl hover:border-gray-700 transition-all duration-300 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
                            <p className="text-gray-400 text-sm font-medium mb-3 flex items-center gap-2">
                                <Wallet className="h-4 w-4" /> Total Balance
                            </p>
                            <p className={`text-4xl font-extrabold tracking-tight ${summary.netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                ₹{Math.abs(summary.netBalance)}
                            </p>
                            <p className="text-sm font-medium mt-2 text-gray-500">
                                {summary.netBalance >= 0 ? 'You are owed in total' : 'You owe in total'}
                            </p>
                        </div>

                        <div className="bg-[#131B2C] border border-gray-800 rounded-2xl p-6 shadow-xl hover:-translate-y-1 hover:shadow-2xl hover:border-gray-700 transition-all duration-300">
                            <p className="text-gray-400 text-sm font-medium mb-3 flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-emerald-400" /> You are owed
                            </p>
                            <p className="text-3xl font-bold text-gray-100">
                                ₹{summary.totalOwesYou}
                            </p>
                        </div>

                        <div className="bg-[#131B2C] border border-gray-800 rounded-2xl p-6 shadow-xl hover:-translate-y-1 hover:shadow-2xl hover:border-gray-700 transition-all duration-300">
                            <p className="text-gray-400 text-sm font-medium mb-3 flex items-center gap-2">
                                <TrendingDown className="h-4 w-4 text-rose-400" /> You owe
                            </p>
                            <p className="text-3xl font-bold text-gray-100">
                                ₹{summary.totalYouOwe}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-[#131B2C] border border-gray-800 rounded-2xl flex flex-col shadow-xl">
                        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                                <Users className="h-5 w-5 text-indigo-400" />
                                Active Groups
                            </h2>
                            <button 
                                onClick={() => setIsModalOpen(true)}
                                className="flex items-center gap-1.5 text-sm bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 px-3 py-1.5 rounded-lg font-semibold transition-colors"
                            >
                                <PlusCircle className="h-4 w-4" />
                                Create
                            </button>
                        </div>

                        <div className="p-4 flex-1">
                            {groups.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center py-10">
                                    <div className="bg-gray-800/50 p-4 rounded-full mb-3">
                                        <Users className="h-8 w-8 text-gray-500" />
                                    </div>
                                    <p className="text-gray-300 font-medium mb-1">No groups yet</p>
                                    <p className="text-sm text-gray-500">Create a group to start splitting bills.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {groups.map((group) => (
                                        <div 
                                            key={group._id} 
                                            onClick={() => navigate(`/group/${group._id}`)} 
                                            className="group p-4 bg-gray-800/30 hover:bg-gray-800/80 rounded-xl border border-transparent hover:border-gray-700 transition-all cursor-pointer flex justify-between items-center"
                                        >
                                            <div>
                                                <h3 className="font-semibold text-gray-100 group-hover:text-indigo-300 transition-colors">{group.name}</h3>
                                                <p className="text-xs text-gray-400 mt-0.5">{group.members?.length || 1} members</p>
                                            </div>
                                            <ChevronRight className="h-5 w-5 text-gray-600 group-hover:text-indigo-400 transition-transform group-hover:translate-x-1" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-[#131B2C] border border-gray-800 rounded-2xl flex flex-col shadow-xl">
                        <div className="p-6 border-b border-gray-800">
                            <h2 className="text-lg font-bold text-gray-100">Friends Balances</h2>
                            <p className="text-xs text-gray-500 mt-1">Individual minimized settlements</p>
                        </div>

                        <div className="p-4 flex-1">
                            {friendBalances.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center py-10">
                                    <div className="bg-gray-800/50 p-4 rounded-full mb-3">
                                        <Activity className="h-8 w-8 text-gray-500" />
                                    </div>
                                    <p className="text-gray-300 font-medium">All settled up!</p>
                                    <p className="text-sm text-gray-500 mt-1">You have no pending balances.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {friendBalances.map((friend) => (
                                        <div key={friend.id} className="flex justify-between items-center p-4 bg-gray-800/30 rounded-xl border border-transparent hover:bg-gray-800/60 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 border border-gray-600 flex items-center justify-center text-gray-200 font-bold shadow-inner">
                                                    {friend.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-semibold text-gray-200">{friend.name}</span>
                                            </div>
                                            <div className={`text-right ${friend.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                <p className="text-[11px] font-bold uppercase tracking-wider opacity-80 mb-0.5">
                                                    {friend.amount > 0 ? 'Owes You' : 'You Owe'}
                                                </p>
                                                <p className="font-black text-lg">₹{Math.abs(friend.amount)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* CREATE GROUP MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#131B2C] border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-gray-800">
                            <h3 className="text-xl font-bold text-white">Create New Group</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateGroup} className="p-6 space-y-5">
                            {createError && (
                                <div className="p-3 bg-rose-500/10 border border-rose-500/50 rounded-lg text-rose-400 text-sm">
                                    {createError}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Group Name</label>
                                <input
                                    type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
                                    placeholder="e.g. Goa Trip, Apartment Rent" required
                                    className="w-full px-4 py-2.5 bg-gray-900/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-gray-600"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Description <span className="text-gray-500 font-normal">(Optional)</span></label>
                                <textarea
                                    value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)}
                                    placeholder="What is this group for?" rows={3}
                                    className="w-full px-4 py-2.5 bg-gray-900/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-gray-600 resize-none"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors border border-gray-700">Cancel</button>
                                <button type="submit" disabled={isCreating} className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors flex justify-center items-center gap-2 disabled:opacity-50">
                                    {isCreating ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Create Group'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* PROFILE & UPI SETTINGS MODAL */}
            {isProfileModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#131B2C] border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-gray-800">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Settings className="h-5 w-5 text-indigo-400" /> Settings
                            </h3>
                            <button onClick={() => setIsProfileModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateUPI} className="p-6 space-y-5">
                            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
                                <p className="text-sm text-gray-300 font-medium">{profile?.name}</p>
                                <p className="text-xs text-gray-500">{profile?.email}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Your UPI ID <span className="text-xs text-gray-500 font-normal">(For receiving payments)</span></label>
                                <input
                                    type="text" value={upiIdInput} onChange={(e) => setUpiIdInput(e.target.value)}
                                    placeholder="e.g. name@oksbi"
                                    className="w-full px-4 py-2.5 bg-gray-900/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-600"
                                />
                                <p className="text-[10px] text-emerald-400/80 mt-2">Linking your UPI lets friends pay you instantly via QR Code.</p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsProfileModalOpen(false)} className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors border border-gray-700">Cancel</button>
                                <button type="submit" disabled={isUpdatingUpi} className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors flex justify-center items-center gap-2 disabled:opacity-50">
                                    {isUpdatingUpi ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Settings'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}