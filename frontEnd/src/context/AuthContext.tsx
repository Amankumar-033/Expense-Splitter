import { createContext, useContext, useState, type ReactNode } from "react";

interface User {
    _id: string;
    name: string;
    email: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (userData: User, userToken: string) => void;
    logout: () => void;
    isAuthenticated: boolean;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({children}: {children: ReactNode}) => {
    // 🔥 MAGIC HERE: Synchronously reading from localStorage at initial render
    const [token, setToken] = useState<string | null>(() => {
        return localStorage.getItem('token');
    });

    const [user, setUser] = useState<User | null>(() => {
        const storedUser = localStorage.getItem('user');
        return storedUser && storedUser !== 'undefined' ? JSON.parse(storedUser) : null;
    });

    // Ab loading ki zaroorat nahi hai kyunki data instantly pehle render mein hi aa gaya
    const [loading, setLoading] = useState(false); 

    const login = (userData: User, userToken: string) => {
        setUser(userData);
        setToken(userToken);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', userToken);
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    };

    return (
        <AuthContext.Provider value={{
            user, 
            token, 
            login, 
            logout, 
            isAuthenticated: !!token, 
            loading
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if(!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};