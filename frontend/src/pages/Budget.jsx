import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth, API } from "../App";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Progress } from "../components/ui/progress";
import { 
  PiggyBank, 
  DollarSign,
  AlertTriangle,
  AlertCircle,
  Save,
  Plus,
  X
} from "lucide-react";
import { motion } from "framer-motion";

const formatCAD = (amount) => {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD'
  }).format(amount);
};

const EXPENSE_CATEGORIES = [
  "Housing",
  "Transportation",
  "Food & Dining",
  "Shopping",
  "Healthcare",
  "Entertainment",
  "Education",
  "Travel",
  "Other"
];

export default function Budget() {
  const { token } = useAuth();
  const [budget, setBudget] = useState(null);
  const [alerts, setAlerts] = useState({ alerts: [], percentage: 0, total_spent: 0, budget: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Form state
  const [totalBudget, setTotalBudget] = useState("");
  const [categoryBudgets, setCategoryBudgets] = useState({});
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newCategoryAmount, setNewCategoryAmount] = useState("");

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [budgetRes, alertsRes] = await Promise.all([
        axios.get(`${API}/budgets?month=${selectedMonth}&year=${selectedYear}`, { headers }),
        axios.get(`${API}/budgets/alerts?month=${selectedMonth}&year=${selectedYear}`, { headers })
      ]);
      
      if (budgetRes.data) {
        setBudget(budgetRes.data);
        setTotalBudget(budgetRes.data.total_budget.toString());
        setCategoryBudgets(budgetRes.data.category_budgets || {});
      } else {
        setBudget(null);
        setTotalBudget("");
        setCategoryBudgets({});
      }
      setAlerts(alertsRes.data);
    } catch (error) {
      toast.error("Failed to load budget data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const handleSave = async () => {
    if (!totalBudget || parseFloat(totalBudget) <= 0) {
      toast.error("Please enter a valid budget amount");
      return;
    }

    setSaving(true);
    try {
      await axios.post(`${API}/budgets`, {
        month: selectedMonth,
        year: selectedYear,
        total_budget: parseFloat(totalBudget),
        category_budgets: categoryBudgets
      }, { headers });
      
      toast.success("Budget saved successfully!");
      fetchData();
    } catch (error) {
      toast.error("Failed to save budget");
    } finally {
      setSaving(false);
    }
  };

  const addCategoryBudget = () => {
    if (!newCategory || !newCategoryAmount) {
      toast.error("Please select a category and enter an amount");
      return;
    }
    setCategoryBudgets({
      ...categoryBudgets,
      [newCategory]: parseFloat(newCategoryAmount)
    });
    setNewCategory("");
    setNewCategoryAmount("");
    setShowCategoryForm(false);
  };

  const removeCategoryBudget = (category) => {
    const updated = { ...categoryBudgets };
    delete updated[category];
    setCategoryBudgets(updated);
  };

  const remainingBudget = alerts.budget > 0 ? alerts.budget - alerts.total_spent : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="budget-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Budget</h1>
          <p className="text-slate-400 mt-1">Set and track your monthly budget</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800/50 rounded-xl p-1">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-transparent text-white px-3 py-2 rounded-lg focus:outline-none"
              data-testid="budget-month-selector"
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
              data-testid="budget-year-selector"
            >
              {Array.from({ length: 5 }, (_, i) => (
                <option key={i} value={new Date().getFullYear() - 2 + i}>
                  {new Date().getFullYear() - 2 + i}
                </option>
              ))}
            </select>
          </div>
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
              data-testid={`budget-alert-${alert.type}`}
            >
              {alert.type === 'danger' ? (
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
              )}
              <p className={alert.type === 'danger' ? 'text-red-400' : 'text-yellow-400'}>
                {alert.message}
              </p>
            </div>
          ))}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget Overview */}
        <Card className="glass-card neon-border" data-testid="budget-overview-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-purple-400" />
              Budget Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {budget ? (
              <>
                <div className="text-center">
                  <p className="text-slate-400 text-sm uppercase tracking-wider">Monthly Budget</p>
                  <p className="text-4xl font-bold text-white font-mono mt-2">
                    {formatCAD(budget.total_budget)}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Spent</span>
                    <span className={`font-mono ${alerts.percentage >= 100 ? 'text-red-400' : 'text-white'}`}>
                      {formatCAD(alerts.total_spent)}
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(alerts.percentage, 100)} 
                    className="h-3"
                  />
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">{alerts.percentage.toFixed(1)}% used</span>
                    <span className={`font-mono ${remainingBudget >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatCAD(remainingBudget)} remaining
                    </span>
                  </div>
                </div>

                {/* Category Breakdown */}
                {Object.keys(categoryBudgets).length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-slate-700">
                    <p className="text-slate-400 text-sm uppercase tracking-wider">Category Budgets</p>
                    {Object.entries(categoryBudgets).map(([cat, amount]) => (
                      <div key={cat} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                        <span className="text-slate-300">{cat}</span>
                        <span className="font-mono text-purple-400">{formatCAD(amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <PiggyBank className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 mb-2">No budget set for this month</p>
                <p className="text-slate-500 text-sm">Set your budget using the form</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Budget Settings */}
        <Card className="glass-card" data-testid="budget-settings-card">
          <CardHeader>
            <CardTitle className="text-white">Set Budget</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-slate-300">Total Monthly Budget (CAD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  type="number"
                  step="0.01"
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-700 text-white text-lg"
                  placeholder="5000.00"
                  data-testid="total-budget-input"
                />
              </div>
            </div>

            {/* Category Budgets */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-slate-300">Category Budgets (Optional)</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCategoryForm(!showCategoryForm)}
                  className="text-purple-400 hover:text-purple-300"
                  data-testid="add-category-budget-btn"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>

              {showCategoryForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="p-4 bg-slate-800/50 rounded-xl space-y-3"
                >
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-900 border-slate-700 text-white rounded-lg p-2"
                    data-testid="new-category-select"
                  >
                    <option value="">Select category</option>
                    {EXPENSE_CATEGORIES.filter(c => !categoryBudgets[c]).map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      type="number"
                      step="0.01"
                      value={newCategoryAmount}
                      onChange={(e) => setNewCategoryAmount(e.target.value)}
                      className="pl-10 bg-slate-900 border-slate-700 text-white"
                      placeholder="Amount"
                      data-testid="new-category-amount-input"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={addCategoryBudget}
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                      data-testid="confirm-category-budget-btn"
                    >
                      Add
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowCategoryForm(false)}
                      className="border-slate-700 text-slate-300"
                    >
                      Cancel
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Listed category budgets */}
              <div className="space-y-2">
                {Object.entries(categoryBudgets).map(([cat, amount]) => (
                  <div 
                    key={cat} 
                    className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                  >
                    <span className="text-slate-300">{cat}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-purple-400">{formatCAD(amount)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCategoryBudget(cat)}
                        className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                        data-testid={`remove-category-${cat}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button 
              onClick={handleSave}
              disabled={saving || !totalBudget}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              data-testid="save-budget-btn"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Budget
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
