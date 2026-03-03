import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, LineChart, BookOpen, Bell, Menu, X, TrendingUp, LogOut, LogIn } from 'lucide-react';
import { useState } from 'react';
import { logout } from '../lib/firebase';

export default function Navbar({ user, setUser }: { user: any, setUser: (user: any) => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { name: 'Home', path: '/', icon: Activity },
    { name: 'Signals', path: '/signals', icon: LineChart },
    { name: 'Chart', path: '/chart', icon: LineChart },
    { name: 'Performance', path: '/performance', icon: TrendingUp },
    { name: 'Education', path: '/education', icon: BookOpen },
    { name: 'Alerts', path: '/alerts', icon: Bell },
  ];

  const handleLogout = async () => {
    await logout();
    setUser(null);
    navigate('/');
  };

  return (
    <nav className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
              <div className="w-8 h-8 rounded bg-yellow-500/20 flex items-center justify-center border border-yellow-500/50">
                <Activity className="w-5 h-5 text-yellow-500" />
              </div>
              <span className="font-bold text-xl tracking-tight text-white">
                SMC<span className="text-yellow-500">Sniper</span>
              </span>
            </Link>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center justify-between flex-1 ml-10">
            <div className="flex items-baseline space-x-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
            
            <div className="flex items-center ml-4">
              {user ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-yellow-500 text-black hover:bg-yellow-400 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  VIP Login
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-400 hover:text-white focus:outline-none"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-black border-b border-white/10">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium transition-colors ${
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
            
            <div className="pt-4 mt-4 border-t border-white/10">
              {user ? (
                <button
                  onClick={() => {
                    handleLogout();
                    setIsOpen(false);
                  }}
                  className="flex w-full items-center gap-3 px-3 py-3 rounded-md text-base font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="flex w-full items-center gap-3 px-3 py-3 rounded-md text-base font-medium text-yellow-500 hover:bg-yellow-500/10 transition-colors"
                >
                  <LogIn className="w-5 h-5" />
                  VIP Login
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
