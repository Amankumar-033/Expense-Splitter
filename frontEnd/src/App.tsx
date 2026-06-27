import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Register from './pages/Register';
import GroupDetails from './pages/GroupDetails';
import ProtectedRoute from './components/ProtectedRoute'; // Ye import add karo

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Register />} /> 
        
        {/* Protected Routes */}
        <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />
        <Route path="/group/:groupId" element={
            <ProtectedRoute><GroupDetails /></ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}