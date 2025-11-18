import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import { Modal, Button, Input } from '@/components/ui';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpForm, setHelpForm] = useState({ title: '', description: '' });

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navItems = [
    {
      path: '/',
      label: 'My Courses',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
      ),
    },
  ];

  const handleHelpSubmit = () => {
    const subject = encodeURIComponent(helpForm.title);
    const body = encodeURIComponent(helpForm.description);
    window.location.href = `mailto:support@example.com?subject=${subject}&body=${body}`;
    setShowHelpModal(false);
    setHelpForm({ title: '', description: '' });
  };

  const secondaryNavItems = [
    {
      label: 'Help & Support',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      action: () => {
        setShowHelpModal(true);
      },
    },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 shadow-2xl transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-700/50">
            <Link
              to="/"
              className="flex items-center space-x-2 group transition-transform hover:scale-105"
              onClick={onClose}
            >
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-blue-500/50 transition-shadow">
                <span className="text-white font-bold text-xl">C</span>
              </div>
              <span className="text-xl font-bold text-white">CourseCraft</span>
            </Link>
            {/* Close button for mobile */}
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 overflow-y-auto">
            {/* Main Navigation */}
            <div className="space-y-1 mb-8">
              <p className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Main
              </p>
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-all group ${
                    isActive(item.path)
                      ? 'bg-gray-700/80 text-white border-l-4 border-blue-500 shadow-md font-medium'
                      : 'text-gray-300 hover:bg-gray-700/50 hover:text-white hover:translate-x-1'
                  }`}
                >
                  <span
                    className={
                      isActive(item.path)
                        ? 'text-blue-400'
                        : 'text-gray-400 group-hover:text-blue-400 transition-colors'
                    }
                  >
                    {item.icon}
                  </span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
            </div>

            {/* Secondary Navigation */}
            <div className="space-y-1">
              <p className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Resources
              </p>
              {secondaryNavItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  className="w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-all text-gray-300 hover:bg-gray-700/50 hover:text-white hover:translate-x-1 group"
                >
                  <span className="text-gray-400 group-hover:text-blue-400 transition-colors">
                    {item.icon}
                  </span>
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* User Info with Dropdown */}
          {user && (
            <div className="p-4 border-t border-gray-700/50 bg-gray-800/50">
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-full flex items-center space-x-3 px-3 py-3 rounded-lg bg-gradient-to-r from-gray-700/80 to-gray-700/60 hover:from-gray-700 hover:to-gray-700 transition-all group border border-gray-600/50 hover:border-blue-500/50"
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center ring-2 ring-blue-500/50 group-hover:ring-blue-400 transition-all shadow-lg">
                    <span className="text-sm font-bold text-white">
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-bold text-white drop-shadow-sm truncate">
                      {user.username}
                    </p>
                    <p className="text-xs text-gray-100 truncate">{user.email}</p>
                  </div>
                  <svg
                    className={`w-4 h-4 text-gray-300 group-hover:text-white transition-all ${
                      showUserMenu ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-red-300 hover:bg-red-900/20 hover:text-red-200 transition-colors"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Help & Support Modal */}
      <Modal
        isOpen={showHelpModal}
        onClose={() => {
          setShowHelpModal(false);
          setHelpForm({ title: '', description: '' });
        }}
        title="Help & Support"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setShowHelpModal(false);
                setHelpForm({ title: '', description: '' });
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleHelpSubmit}
              disabled={!helpForm.title.trim() || !helpForm.description.trim()}
            >
              Send Email
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Need help? Fill out the form below and we'll get back to you as soon as possible.
          </p>
          <Input
            label="Subject"
            placeholder="What do you need help with?"
            value={helpForm.title}
            onChange={e => setHelpForm({ ...helpForm, title: e.target.value })}
          />
          <Input
            label="Description"
            placeholder="Please describe your issue or question in detail..."
            value={helpForm.description}
            onChange={e => setHelpForm({ ...helpForm, description: e.target.value })}
            variant="textarea"
            rows={6}
          />
        </div>
      </Modal>
    </>
  );
}
