import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth, API } from "../App";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  PiggyBank, 
  AlertTriangle,
  AlertCircle,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  RefreshCw
} from "lucide-react";
import { motion } from "framer-motion";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

const COLORS = ['#8B5CF6', '#06B6D4', '#EC4899', '#10B981', '#F59E0B', '#EF4444'];

const formatCAD = (amount) => {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD'
  }).format(amount);
};

export default function Dashboard() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [alerts, setAlerts] = useState({ alerts: [], percentage: 0, total_spent: 0, budget: 0 });
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [summaryRes, trendsRes, alertsRes] = await Promise.all([
        axios.get(`${API}/analytics/summary?month=${selectedMonth}&year=${selectedYear}`, { headers }),
        axios.get(`${API}/analytics/trends?months=6`, { headers }),
        axios.get(`${API}/budgets/alerts?month=${selectedMonth}&year=${selectedYear}`, { headers })
      ]);
      
      setSummary(summaryRes.data);
      setTrends(trendsRes.data.trends);
      setAlerts(alertsRes.data);
    } catch (error) {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const processRecurring = async () => {
    try {
      await axios.post(`${API}/recurring/process?month=${selectedMonth}&year=${selectedYear}`, {}, { headers });
      toast.success("Recurring items processed!");
      fetchData();
    } catch (error) {
      toast.error("Failed to process recurring items");
    }
  };

  const categoryData = summary?.category_breakdown 
    ? Object.entries(summary.category_breakdown).map(([name, value]) => ({ name, value }))
    : [];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-slate-300 font-medium">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="font-mono text-sm">
              {entry.name}: {formatCAD(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-slate-400 mt-1">Your financial overview</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800/50 rounded-xl p-1">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-transparent text-white px-3 py-2 rounded-lg focus:outline-none"
              data-testid="month-selector"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-transparent text-white px-3 py-2 rounded-lg focus:outline-none"
              data-testid="year-selector"
            >
              {Array.from({ length: 5 }, (_, i) => (
                <option key={i} value={new Date().getFullYear() - 2 + i}>
                  {new Date().getFullYear() - 2 + i}
                </option>
              ))}
            </select>
          </div>
          <Button 
            onClick={processRecurring}
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
            data-testid="process-recurring-btn"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Process Recurring
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          {alerts.alerts.map((alert, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 p-4 rounded-xl ${
                alert.type === 'danger' 
                  ? 'bg-red-500/10 border border-red-500/30' 
                  : 'bg-yellow-500/10 border border-yellow-500/30'
              }`}
              data-testid={`alert-${alert.type}`}
            >
              {alert.type === 'danger' ? (
                <AlertCircle className="w-5 h-5 text-red-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
              )}
              <p className={alert.type === 'danger' ? 'text-red-400' : 'text-yellow-400'}>
                {alert.message}
              </p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-card neon-border card-hover" data-testid="income-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm uppercase tracking-wider">Total Income</p>
                  <p className="text-2xl font-bold text-white font-mono mt-1">
                    {formatCAD(summary?.total_income || 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass-card neon-border-pink card-hover" data-testid="expenses-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm uppercase tracking-wider">Total Expenses</p>
                  <p className="text-2xl font-bold text-white font-mono mt-1">
                    {formatCAD(summary?.total_expenses || 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-pink-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass-card neon-border-cyan card-hover" data-testid="savings-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm uppercase tracking-wider">Net Savings</p>
                  <p className={`text-2xl font-bold font-mono mt-1 ${
                    (summary?.net_savings || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {formatCAD(summary?.net_savings || 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                  <PiggyBank className="w-6 h-6 text-cyan-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass-card neon-border card-hover" data-testid="budget-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm uppercase tracking-wider">Budget Used</p>
                  <p className={`text-2xl font-bold font-mono mt-1 ${
                    alerts.percentage >= 100 ? 'text-red-400' : 
                    alerts.percentage >= 80 ? 'text-yellow-400' : 'text-purple-400'
                  }`}>
                    {alerts.percentage.toFixed(1)}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-purple-400" />
                </div>
              </div>
              {alerts.budget > 0 && (
                <div className="mt-3">
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        alerts.percentage >= 100 ? 'bg-red-500' : 
                        alerts.percentage >= 80 ? 'bg-yellow-500' : 'bg-purple-500'
                      }`}
                      style={{ width: `${Math.min(alerts.percentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {formatCAD(alerts.total_spent)} of {formatCAD(alerts.budget)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trends Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2"
        >
          <Card className="glass-card" data-testid="trends-chart">
            <CardHeader>
              <CardTitle className="text-white">Income vs Expenses Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends}>
                    <defs>
                      <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EC4899" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#EC4899" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="month_name" stroke="#64748B" />
                    <YAxis stroke="#64748B" tickFormatter={(value) => `$${value}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="income"
                      name="Income"
                      stroke="#10B981"
                      fillOpacity={1}
                      fill="url(#incomeGradient)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      name="Expenses"
                      stroke="#EC4899"
                      fillOpacity={1}
                      fill="url(#expenseGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Category Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="glass-card" data-testid="category-chart">
            <CardHeader>
              <CardTitle className="text-white">Spending by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => formatCAD(value)}
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          border: '1px solid #334155',
                          borderRadius: '8px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500">
                    No expense data
                  </div>
                )}
              </div>
              {/* Legend */}
              <div className="grid grid-cols-2 gap-2 mt-4">
                {categoryData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm text-slate-400 truncate">{entry.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payment Methods */}
        <Card className="glass-card" data-testid="payment-methods-card">
          <CardHeader>
            <CardTitle className="text-white">Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(summary?.payment_breakdown || {}).map(([method, amount]) => (
                <div key={method} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                  <span className="text-slate-300 capitalize">{method}</span>
                  <span className="font-mono text-white">{formatCAD(amount)}</span>
                </div>
              ))}
              {Object.keys(summary?.payment_breakdown || {}).length === 0 && (
                <p className="text-slate-500 text-center py-4">No payment data</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Income Sources */}
        <Card className="glass-card" data-testid="income-sources-card">
          <CardHeader>
            <CardTitle className="text-white">Income Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(summary?.income_breakdown || {}).map(([source, amount]) => (
                <div key={source} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                  <span className="text-slate-300">{source}</span>
                  <span className="font-mono text-emerald-400">{formatCAD(amount)}</span>
                </div>
              ))}
              {Object.keys(summary?.income_breakdown || {}).length === 0 && (
                <p className="text-slate-500 text-center py-4">No income data</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
