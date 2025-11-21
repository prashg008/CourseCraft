import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { SocketProvider } from '@/websocket';
import { ProtectedRoute, GuestRoute } from '@/components/auth';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import CourseList from '@/pages/CourseList';
import CreateCourse from '@/pages/CreateCourse';
import CourseDetail from '@/pages/CourseDetail';
import { WS_BASE_URL } from '@/services/api';

function App() {
  // Custom wrapper to access auth context and pass to SocketProvider
  function Providers({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();
    return (
      <SocketProvider
        url={WS_BASE_URL}
        namespace="/ws"
        autoConnect={true}
        isAuthenticated={isAuthenticated}
        isLoading={isLoading}
      >
        {children}
      </SocketProvider>
    );
  }
  return (
    <BrowserRouter>
      <AuthProvider>
        <Providers>
          <Toaster />
          <Routes>
            <Route
              path="/login"
              element={
                <GuestRoute>
                  <Login />
                </GuestRoute>
              }
            />
            <Route
              path="/signup"
              element={
                <GuestRoute>
                  <Signup />
                </GuestRoute>
              }
            />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <CourseList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/create"
              element={
                <ProtectedRoute>
                  <CreateCourse />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/:id"
              element={
                <ProtectedRoute>
                  <CourseDetail />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Providers>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
