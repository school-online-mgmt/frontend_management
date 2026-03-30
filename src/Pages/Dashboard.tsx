import { Users, BookOpen, GraduationCap, Calendar, TrendingUp, Clock, Activity, BarChart3, PieChart, FileText } from 'lucide-react';
import Button from '../components/common/Button';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '../components/common/FormComponents';

const Dashboard = () => {
  const stats = [
    { 
      title: 'Total Students', 
      value: '1,245', 
      icon: Users, 
      color: 'text-blue-600', 
      bgIcon: 'bg-blue-100',
      trend: '+12%',
      trendPositive: true,
      period: 'vs last month'
    },
    { 
      title: 'Active Teachers', 
      value: '86', 
      icon: GraduationCap, 
      color: 'text-purple-600', 
      bgIcon: 'bg-purple-100',
      trend: '+2%',
      trendPositive: true,
      period: 'vs last month'
    },
    { 
      title: 'Active Subjects', 
      value: '42', 
      icon: BookOpen, 
      color: 'text-emerald-600', 
      bgIcon: 'bg-emerald-100',
      trend: '+5%',
      trendPositive: true,
      period: 'vs last month'
    },
    { 
      title: 'Ongoing Exams', 
      value: '12', 
      icon: Activity, 
      color: 'text-orange-600', 
      bgIcon: 'bg-orange-100',
      trend: '+8%',
      trendPositive: true,
      period: 'this month'
    },
  ];

  const recentActivities = [
    { 
      id: 1, 
      action: 'New student enrollment', 
      description: 'John Doe enrolled in 10th Grade',
      time: '2 hours ago', 
      user: 'Admin', 
      type: 'enrollment',
      icon: Users
    },
    { 
      id: 2, 
      action: 'Updated Math syllabus', 
      description: 'Chapter 1-5 added to curriculum',
      time: '4 hours ago', 
      user: 'Sarah Johnson', 
      type: 'update',
      icon: FileText
    },
    { 
      id: 3, 
      action: 'Parent-teacher meeting scheduled', 
      description: 'Meeting on March 28, 2026 at 3 PM',
      time: 'Yesterday', 
      user: 'Principal', 
      type: 'meeting',
      icon: Calendar
    },
    { 
      id: 4, 
      action: 'Exam paper published', 
      description: 'Biology Term 1 exam published',
      time: '2 days ago', 
      user: 'System', 
      type: 'system',
      icon: BookOpen
    },
  ];

  return (
    <div className="min-h-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
            <p className="text-slate-600 mt-2 text-lg">Welcome back! Here's what's happening in your school.</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button variant="secondary" icon={<FileText size={18} />}>
              Export Report
            </Button>
            <Button variant="primary" icon={<Calendar size={18} />}>
              New Event
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, index) => {
            const StatIcon = stat.icon;
            return (
              <Card key={index} hoverable bordered>
                <CardContent>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-lg ${stat.bgIcon}`}>
                      <StatIcon className={`${stat.color}`} size={24} />
                    </div>
                    <Badge variant={stat.trendPositive ? 'success' : 'danger'}>
                      <TrendingUp size={12} />
                      {stat.trend}
                    </Badge>
                  </div>
                  <p className="text-slate-600 text-sm font-medium uppercase tracking-wide mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold text-slate-900 mb-1">{stat.value}</p>
                  <p className="text-xs text-slate-500">{stat.period}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          
          {/* Attendance Chart */}
          <div className="lg:col-span-2">
            <Card hoverable bordered>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 size={20} />
                      Attendance Overview
                    </CardTitle>
                    <p className="text-slate-500 text-sm mt-2">Weekly student participation metrics</p>
                  </div>
                  <select className="px-4 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors">
                    <option>This Week</option>
                    <option>Last Week</option>
                    <option>This Month</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-72 flex items-end justify-between gap-3 px-2">
                  {[65, 45, 75, 55, 85, 95, 60].map((height, i) => (
                    <div key={i} className="flex-1 group relative">
                      <div className="h-full bg-slate-100 rounded-t-lg overflow-hidden relative">
                        <div 
                          className="absolute inset-0 bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-lg transition-all duration-300 group-hover:shadow-lg group-hover:shadow-emerald-500/30"
                          style={{ height: `${height}%` }}
                        />
                        <div className="absolute inset-0 bg-white/5 rounded-t-lg" />
                      </div>
                      <span className="block text-center text-xs font-semibold text-slate-500 mt-3 group-hover:text-emerald-600 transition-colors">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                      </span>
                      
                      {/* Tooltip */}
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-bold py-2 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-xl">
                        {height}% Attendance
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activities */}
          <Card hoverable bordered className="flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock size={20} />
                  Recent Activity
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-4 overflow-y-auto max-h-96">
              {recentActivities.map((activity) => {
                const Icon = activity.icon;
                return (
                  <div key={activity.id} className="pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                    <div className="flex gap-3">
                      <div className="mt-1 w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon size={16} className="text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{activity.action}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{activity.description}</p>
                        <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                          <span>{activity.user}</span>
                          <span>•</span>
                          <span>{activity.time}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Student Distribution */}
          <Card hoverable bordered>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart size={20} />
                Student Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { label: '10th Grade', value: 345, percentage: 28, color: 'bg-emerald-500' },
                  { label: '9th Grade', value: 298, percentage: 24, color: 'bg-blue-500' },
                  { label: '8th Grade', value: 267, percentage: 21, color: 'bg-purple-500' },
                  { label: 'Other Classes', value: 335, percentage: 27, color: 'bg-orange-500' },
                ].map((item, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">{item.label}</span>
                      <span className="text-sm font-bold text-slate-900">{item.value}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${item.color} transition-all duration-500`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 mt-1">{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card hoverable bordered>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity size={20} />
                Key Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[
                  { label: 'Enrollment Rate', value: '94%', trend: '+3%' },
                  { label: 'Teacher Attendance', value: '98%', trend: '+2%' },
                  { label: 'Exam Completion', value: '87%', trend: '+5%' },
                  { label: 'Parent Satisfaction', value: '92%', trend: '+4%' },
                ].map((metric, index) => (
                  <div key={index} className="flex items-center justify-between pb-6 border-b border-slate-100 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{metric.label}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-900">{metric.value}</p>
                      <p className="text-xs text-emerald-600 font-semibold mt-1">{metric.trend}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
