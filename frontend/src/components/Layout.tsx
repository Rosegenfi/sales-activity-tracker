import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Trophy,
  Calendar,
  Target,
  Users,
  LogOut,
  Menu,
  X,
  ChevronDown,
  BookOpen,
  BarChart3,
} from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Leaderboard', href: '/leaderboard', icon: Trophy },
    { name: 'Weekly Commits', href: '/weekly-commits', icon: Calendar },
    { name: 'Daily Goals', href: '/daily-goals', icon: Target },
    { name: 'AE Hub', href: '/team-updates', icon: BookOpen },
  ];

  if (user?.role === 'admin') {
    navigation.push({ name: 'User Management', href: '/users', icon: Users });
    navigation.push({ name: 'Admin Activity', href: '/admin/activity', icon: BarChart3 });
  }

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-1 bg-primary-900">
          <div className="flex items-center justify-center h-16 bg-primary-950 px-4">
            {/* Logo - Replace /images/logo.png with your actual logo path */}
            <img 
              src="/images/logo.png" 
              alt="Sales Tracker Logo" 
              className="h-10 w-auto"
              onError={(e) => {
                // Fallback to text if logo doesn't load
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <h1 className="hidden text-white text-xl font-bold">Sales Tracker</h1>
          </div>
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={clsx(
                    'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive(item.href)
                      ? 'bg-primary-800 text-white'
                      : 'text-primary-100 hover:bg-primary-800 hover:text-white'
                  )}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="flex-shrink-0 flex border-t border-primary-800 p-4">
            <button
              onClick={logout}
              className="flex items-center text-primary-100 hover:text-white transition-colors"
            >
              <LogOut className="mr-3 h-5 w-5" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden">
        <div className="bg-primary-900 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <img 
              src="/images/logo.png" 
              alt="Sales Tracker Logo" 
              className="h-8 w-auto"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <h1 className="hidden text-white text-lg font-bold">Sales Tracker</h1>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-white"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        
        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="bg-primary-900 px-2 py-2 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={clsx(
                    'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive(item.href)
                      ? 'bg-primary-800 text-white'
                      : 'text-primary-100 hover:bg-primary-800 hover:text-white'
                  )}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
            <button
              onClick={logout}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-primary-100 hover:text-white hover:bg-primary-800 rounded-md transition-colors"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Logout
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Bar */}
        <div className="sticky top-0 z-10 bg-white shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  {navigation.find(item => isActive(item.href))?.name || 'Sales Tracker'}
                </h2>
              </div>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <button
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium">
                      {user?.firstName[0]}{user?.lastName[0]}
                    </div>
                    <span className="ml-3 text-gray-700 font-medium hidden sm:block">
                      {user?.firstName} {user?.lastName}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 text-gray-500" />
                  </button>
                  
                  {isProfileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                      <div className="py-1">
                        <button
                          onClick={() => {
                            navigate(`/profile/${user?.id}`);
                            setIsProfileDropdownOpen(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          My Profile
                        </button>
                        <button
                          onClick={() => {
                            navigate('/change-password');
                            setIsProfileDropdownOpen(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Change Password
                        </button>
                        {user?.role === 'admin' && (
                          <>
                            <div className="border-t border-gray-100"></div>
                            <div className="px-4 py-2 text-xs text-gray-500 uppercase tracking-wide">
                              Admin
                            </div>
                            <button
                              onClick={() => {
                                navigate('/users');
                                setIsProfileDropdownOpen(false);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              User Management
                            </button>
                            <button
                              onClick={() => {
                                navigate('/admin/activity');
                                setIsProfileDropdownOpen(false);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              Admin Activity
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Outlet */}
        <main className="py-6">
          <div className="px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;