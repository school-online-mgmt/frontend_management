import { Users, BookOpen, GraduationCap, Calendar, TrendingUp, Clock, ArrowRight } from 'lucide-react';

const Dashboard = () => {
  const stats = [
    { title: 'Total Students', value: '1,245', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', trend: '+12%' },
    { title: 'Active Subjects', value: '42', icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: '+5%' },
    { title: 'Teachers', value: '86', icon: GraduationCap, color: 'text-purple-600', bg: 'bg-purple-50', trend: '+2%' },
    { title: 'Events This Month', value: '12', icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-50', trend: '+8%' },
  ];

  const recentActivities = [
    { id: 1, action: 'New student enrollment', time: '2 hours ago', user: 'Admin', type: 'enrollment' },
    { id: 2, action: 'Updated Math syllabus', time: '4 hours ago', user: 'Sarah Johnson', type: 'update' },
    { id: 3, action: 'Parent-teacher meeting scheduled', time: 'Yesterday', user: 'Principal', type: 'meeting' },
    { id: 4, action: 'System maintenance completed', time: '2 days ago', user: 'System', type: 'system' },
  ];

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-slate-500 mt-2 text-lg">Welcome back to the school management portal.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-medium shadow-sm hover:bg-slate-50 transition-colors">
            Export Report
          </button>
          <button className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-medium shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all hover:-translate-y-0.5">
            + New Event
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="group bg-white p-6 rounded-2xl shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] border border-slate-100 hover:border-emerald-100 hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-transparent to-slate-50 rounded-bl-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
            
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className={`p-3.5 rounded-xl ${stat.bg} ${stat.color} ring-1 ring-inset ring-black/5`}>
                <stat.icon size={22} strokeWidth={2} />
              </div>
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                <TrendingUp size={12} /> {stat.trend}
              </span>
            </div>
            
            <div className="relative z-10">
              <h3 className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-1">{stat.title}</h3>
              <p className="text-3xl font-bold text-slate-800 tracking-tight">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Area */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] border border-slate-100">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Attendance Overview</h2>
              <p className="text-slate-400 text-sm mt-1">Weekly student participation metrics</p>
            </div>
            <select className="bg-slate-50 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer hover:bg-white">
              <option>This Week</option>
              <option>Last Week</option>
              <option>This Month</option>
            </select>
          </div>
          
          <div className="h-72 flex items-end justify-between gap-4 px-2">
            {[65, 45, 75, 55, 85, 95, 60].map((height, i) => (
              <div key={i} className="w-full flex flex-col justify-end group h-full relative">
                <div className="w-full bg-slate-100 rounded-t-xl relative overflow-hidden h-full">
                  <div 
                    className="absolute bottom-0 left-0 right-0 bg-emerald-500 rounded-t-xl transition-all duration-700 ease-out group-hover:bg-emerald-400 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                    style={{ height: `${height}%` }}
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-white/20"></div>
                  </div>
                </div>
                <span className="text-center text-xs font-semibold text-slate-400 mt-3 group-hover:text-emerald-600 transition-colors">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                </span>
                
                {/* Tooltip */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs font-bold py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-xl whitespace-nowrap z-20">
                  {height}% Attendance
                  <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-8 rounded-3xl shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] border border-slate-100 flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold text-slate-800">Recent Activity</h2>
            <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-emerald-600 transition-colors">
              <ArrowRight size={18} />
            </button>
          </div>
          
          <div className="space-y-8 relative flex-1">
            {/* Timeline Line */}
            <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-slate-100"></div>
            
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex gap-5 relative group">
                <div className="relative z-10 mt-1">
                  <div className="w-10 h-10 rounded-full bg-white border-4 border-slate-50 flex items-center justify-center shadow-sm group-hover:border-emerald-50 group-hover:scale-110 transition-all duration-300">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 group-hover:bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]"></div>
                  </div>
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-slate-800 font-semibold text-sm group-hover:text-emerald-700 transition-colors">{activity.action}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                      <Clock size={10} /> {activity.time}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">by {activity.user}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <button className="w-full mt-8 py-3.5 text-sm font-bold text-emerald-700 bg-emerald-50/80 border border-emerald-100 rounded-xl hover:bg-emerald-100 hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-900/5 transition-all duration-300 flex items-center justify-center gap-2 group">
            View All Activity
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
