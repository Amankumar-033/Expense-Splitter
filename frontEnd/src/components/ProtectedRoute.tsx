import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';
import React, { JSX } from 'react';

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        // Jab tak token verify nahi ho jata, tab tak loading spinner dikhao
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0B0F19]">
                <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated) {
        // Agar login nahi hai, toh login page pe bhejo
        return <Navigate to="/login" replace />;
    }

    return children;
}