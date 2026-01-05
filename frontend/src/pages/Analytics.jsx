import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth, API } from "../App";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  PiggyBank
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
  BarChart,
  Bar,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts";

const formatCAD = (amount) => {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD'
  }).format(amount);
};

const COLORS = ['#8B5CF6', '#06B6D4', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#14B8A6'];

export default function Analytics() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState([]);
  const [categoryTrends, setCategoryTrends] = useState({ categories: [], data: [] });
  const [selectedMonths, setSelectedMonths] = useState(6);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [trendsRes, categoryRes] = await Promise.all([
        axios.get(`${API}/analytics/trends?months=${selectedMonths}`, { headers }),
        axios.get(`${API}/analytics/category-trends?months=${selectedMonths}`, { headers })
      ]);
      
      setTrends(trendsRes.data.trends);
      setCategoryTrends(categoryRes.data);
    } catch (error) {
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonths]);

  const totalIncome = trends.reduce((sum, t) => sum + t.income, 0);
  const totalExpenses = trends.reduce((sum, t) => sum + t.expenses, 0);
  const totalSavings = totalIncome - totalExpenses;
  const avgMonthlySavings = trends.length > 0 ? totalSavings / trends.length : 0;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-slate-300 font-medium mb-2">{label}</p>
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

  // Calculate category totals for pie chart
  const categoryTotals = {};
  categoryTrends.data.forEach(month => {
    categoryTrends.categories.forEach(cat => {
      if (month[cat]) {
        categoryTotals[cat] = (categoryTotals[cat] || 0) + month[cat];
      }
    });
  });
  const pieData = Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="analytics-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Analytics</h1>
          <p className="text-slate-400 mt-1">Deep insights into your finances</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-800/50 rounded-xl p-1">
          <select
            value={selectedMonths}
            onChange={(e) => setSelectedMonths(parseInt(e.target.value))}
            className="bg-transparent text-white px-3 py-2 rounded-lg focus:outline-none"
            data-testid="analytics-months-selector"
          >
            <option value={3}>Last 3 months</option>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass-card" data-testid="total-income-stat">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-xs uppercase">Total Income</p>
                  <p className="text-lg font-bold text-emerald-400 font-mono">{formatCAD(totalIncome)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass-card" data-testid="total-expenses-stat">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-500/20 rounded-xl flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-pink-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-xs uppercase">Total Expenses</p>
                  <p className="text-lg font-bold text-pink-400 font-mono">{formatCAD(totalExpenses)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="glass-card" data-testid="total-savings-stat">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                  <PiggyBank className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-xs uppercase">Net Savings</p>
                  <p className={`text-lg font-bold font-mono ${totalSavings >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                    {formatCAD(totalSavings)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="glass-card" data-testid="avg-savings-stat">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-xs uppercase">Avg Monthly</p>
                  <p className={`text-lg font-bold font-mono ${avgMonthlySavings >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                    {formatCAD(avgMonthlySavings)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs Expenses Area Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="glass-card" data-testid="income-expense-chart">
            <CardHeader>
              <CardTitle className="text-white">Income vs Expenses</CardTitle>
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

        {/* Savings Trend */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card className="glass-card" data-testid="savings-trend-chart">
            <CardHeader>
              <CardTitle className="text-white">Savings Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="month_name" stroke="#64748B" />
                    <YAxis stroke="#64748B" tickFormatter={(value) => `$${value}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="savings" 
                      name="Savings"
                      fill="#06B6D4"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Category Spending Pie Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <Card className="glass-card" data-testid="category-pie-chart">
            <CardHeader>
              <CardTitle className="text-white">Spending Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {pieData.map((entry, index) => (
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
                    No expense data for this period
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Category Trends Line Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
          <Card className="glass-card" data-testid="category-trends-chart">
            <CardHeader>
              <CardTitle className="text-white">Category Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {categoryTrends.categories.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={categoryTrends.data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="month_name" stroke="#64748B" />
                      <YAxis stroke="#64748B" tickFormatter={(value) => `$${value}`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      {categoryTrends.categories.slice(0, 5).map((cat, index) => (
                        <Line
                          key={cat}
                          type="monotone"
                          dataKey={cat}
                          name={cat}
                          stroke={COLORS[index % COLORS.length]}
                          strokeWidth={2}
                          dot={{ fill: COLORS[index % COLORS.length], strokeWidth: 2 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500">
                    No category data for this period
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Monthly Breakdown Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
        <Card className="glass-card" data-testid="monthly-breakdown-card">
          <CardHeader>
            <CardTitle className="text-white">Monthly Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Month</th>
                    <th className="text-right py-3 px-4 text-slate-400 font-medium">Income</th>
                    <th className="text-right py-3 px-4 text-slate-400 font-medium">Expenses</th>
                    <th className="text-right py-3 px-4 text-slate-400 font-medium">Savings</th>
                    <th className="text-right py-3 px-4 text-slate-400 font-medium">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {trends.map((month) => {
                    const savingsRate = month.income > 0 ? (month.savings / month.income * 100) : 0;
                    return (
                      <tr key={`${month.month}-${month.year}`} className="border-b border-slate-800 table-row-hover">
                        <td className="py-3 px-4 text-white">{month.month_name} {month.year}</td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-400">{formatCAD(month.income)}</td>
                        <td className="py-3 px-4 text-right font-mono text-pink-400">{formatCAD(month.expenses)}</td>
                        <td className={`py-3 px-4 text-right font-mono ${month.savings >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                          {formatCAD(month.savings)}
                        </td>
                        <td className={`py-3 px-4 text-right font-mono ${savingsRate >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                          {savingsRate.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
