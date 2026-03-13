import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {LayoutDashboard, BookOpen, LogOut, School, GraduationCap} from 'lucide-react';

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/subject-Home', label: 'Subjects', icon: BookOpen },
    { path: '/course-home', label: 'Courses', icon: GraduationCap },
    { path: '/section-home', label: 'sections', icon: GraduationCap },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans text-slate-800">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900 text-white flex flex-col shadow-2xl z-30 relative overflow-hidden">
        {/* Abstract Background Decoration */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500 rounded-full blur-3xl"></div>
        </div>

        <div className="p-8 relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 bg-emerald-500/20 rounded-xl border border-emerald-500/30 backdrop-blur-sm">
              <School className="text-emerald-400" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">EduAdmin</h2>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">Portal</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/');
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all duration-300 ease-out relative overflow-hidden ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <item.icon
                    size={20}
                    className={`transition-colors duration-300 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-emerald-400'}`}
                  />
                  <span className="font-medium relative z-10">{item.label}</span>
                  
                  {/* Active Indicator */}
                  {isActive && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white/20 rounded-l-full"></div>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-white/5 relative z-10">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3.5 w-full text-left text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all duration-300 group"
          >
            <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-[#F8FAFC] relative">
        {/* Header/Top Bar could go here if needed, but we'll keep it simple */}
        <div className="min-h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
