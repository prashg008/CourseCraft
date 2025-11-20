import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/context/AuthContext';
import { SocketProvider } from '@/websocket';
import { ProtectedRoute, GuestRoute } from '@/components/auth';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import CourseList from '@/pages/CourseList';
import CreateCourse from '@/pages/CreateCourse';
import CourseDetail from '@/pages/CourseDetail';
import { WS_BASE_URL } from '@/services/api';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider url={WS_BASE_URL} namespace="/ws" autoConnect={true}>
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
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
