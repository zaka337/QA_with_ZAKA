import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navigation from './sections/Navigation';
import Hero from './sections/Hero';
import Curriculum from './sections/Curriculum';
import CinematicVision from './sections/CinematicVision';
import AlumniArchives from './sections/AlumniArchives';
import Footer from './sections/Footer';
import CapabilityDetail from './sections/CapabilityDetail';
import ProtectedRoute from './components/ProtectedRoute';
import GuestRoute from './components/GuestRoute';
import RoleRoute from './components/RoleRoute';
import Chatbot from './components/Chatbot';

// Lazy load new pages for better performance
const Pricing = lazy(() => import('./pages/Pricing'));
const Auth = lazy(() => import('./pages/Auth'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CoursePlayer = lazy(() => import('./pages/CoursePlayer'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const Settings = lazy(() => import('./pages/Settings'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

function HomePage() {
  return (
    <div
      style={{
        background: '#0a0a0a',
        minHeight: '100vh',
        overflowX: 'hidden',
      }}
    >
      <Navigation />

      <main>
        <Hero />
        <Curriculum />
        <CinematicVision />
        <AlumniArchives />
        <Footer />
      </main>
    </div>
  );
}

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="loading-text">
        <span>L</span><span>O</span><span>A</span><span>D</span><span>I</span><span>N</span><span>G</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/capability/:slug" element={<CapabilityDetail />} />
        
        {/* New Learning Platform Routes */}
        <Route path="/pricing" element={<><Navigation /><Pricing /><Footer /></>} />
        <Route path="/login" element={<GuestRoute><Navigation /><Auth type="login" /><Footer /></GuestRoute>} />
        <Route path="/signup" element={<GuestRoute><Navigation /><Auth type="signup" /><Footer /></GuestRoute>} />
        <Route path="/forgot-password" element={<GuestRoute><Navigation /><ForgotPassword /><Footer /></GuestRoute>} />
        <Route path="/reset-password" element={<GuestRoute><Navigation /><ResetPassword /><Footer /></GuestRoute>} />
        <Route path="/payment-success" element={<ProtectedRoute><Navigation /><PaymentSuccess /><Footer /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Navigation /><Dashboard /><Footer /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Navigation /><Settings /><Footer /></ProtectedRoute>} />
        <Route path="/admin/*" element={<RoleRoute allowedRoles={['admin']}><Navigation /><AdminDashboard /><Footer /></RoleRoute>} />
        
        {/* Cinema Mode Course Player (No Navigation/Footer) */}
        <Route path="/course/:courseId" element={<ProtectedRoute><CoursePlayer /></ProtectedRoute>} />
      </Routes>
      <Chatbot />
    </Suspense>
  );
}
