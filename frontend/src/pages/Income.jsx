import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth, API } from "../App";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Switch } from "../components/ui/switch";
import { 
  Plus, 
  Trash2, 
  TrendingUp,
  CalendarIcon,
  RefreshCw,
  DollarSign
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

const formatCAD = (amount) => {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD'
  }).format(amount);
};

const INCOME_SOURCES = [
  "Salary",
  "Freelance",
  "Investments",
  "Rental Income",
  "Side Business",
  "Dividends",
  "Bonus",
  "Other"
];

export default function Income() {
  const { token } = useAuth();
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Form state
  const [source, setSource] = useState("");
  const [customSource, setCustomSource] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date());
  const [description, setDescription] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchIncomes = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API}/income?month=${selectedMonth}&year=${selectedYear}`,
        { headers }
      );
      setIncomes(response.data);
    } catch (error) {
      toast.error("Failed to load income data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncomes();
  }, [selectedMonth, selectedYear]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalSource = source === "Other" ? customSource : source;
    
    if (!finalSource || !amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await axios.post(`${API}/income`, {
        source: finalSource,
        amount: parseFloat(amount),
        date: format(date, "yyyy-MM-dd"),
        description,
        is_recurring: isRecurring
      }, { headers });
      
      toast.success("Income added successfully!");
      setDialogOpen(false);
      resetForm();
      fetchIncomes();
    } catch (error) {
      toast.error("Failed to add income");
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/income/${id}`, { headers });
      toast.success("Income deleted");
      fetchIncomes();
    } catch (error) {
      toast.error("Failed to delete income");
    }
  };

  const resetForm = () => {
    setSource("");
    setCustomSource("");
    setAmount("");
    setDate(new Date());
    setDescription("");
    setIsRecurring(false);
  };

  const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);

  return (
    <div className="space-y-6" data-testid="income-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Income</h1>
          <p className="text-slate-400 mt-1">Track your income sources</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800/50 rounded-xl p-1">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-transparent text-white px-3 py-2 rounded-lg focus:outline-none"
              data-testid="income-month-selector"
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
              data-testid="income-year-selector"
            >
              {Array.from({ length: 5 }, (_, i) => (
                <option key={i} value={new Date().getFullYear() - 2 + i}>
                  {new Date().getFullYear() - 2 + i}
                </option>
              ))}
            </select>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700" data-testid="add-income-btn">
                <Plus className="w-4 h-4 mr-2" />
                Add Income
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Add Income</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Source</Label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full bg-slate-800 border-slate-700 text-white rounded-lg p-2"
                    required
                    data-testid="income-source-select"
                  >
                    <option value="">Select source</option>
                    {INCOME_SOURCES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                
                {source === "Other" && (
                  <div className="space-y-2">
                    <Label className="text-slate-300">Custom Source</Label>
                    <Input
                      value={customSource}
                      onChange={(e) => setCustomSource(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white"
                      placeholder="Enter source name"
                      required
                      data-testid="income-custom-source-input"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-slate-300">Amount (CAD)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-10 bg-slate-800 border-slate-700 text-white"
                      placeholder="0.00"
                      required
                      data-testid="income-amount-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left bg-slate-800 border-slate-700 text-white"
                        data-testid="income-date-btn"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(date, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-700">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(d) => d && setDate(d)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Description (optional)</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                    placeholder="Add a note..."
                    data-testid="income-description-input"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-cyan-400" />
                    <span className="text-slate-300">Recurring income</span>
                  </div>
                  <Switch
                    checked={isRecurring}
                    onCheckedChange={setIsRecurring}
                    data-testid="income-recurring-switch"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600"
                  data-testid="income-submit-btn"
                >
                  Add Income
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="glass-card neon-border" data-testid="income-summary-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm uppercase tracking-wider">Total Income</p>
              <p className="text-3xl font-bold text-emerald-400 font-mono mt-1">
                {formatCAD(totalIncome)}
              </p>
              <p className="text-slate-500 text-sm mt-1">
                {incomes.length} transaction{incomes.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-emerald-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Income List */}
      <Card className="glass-card" data-testid="income-list-card">
        <CardHeader>
          <CardTitle className="text-white">Income Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
          ) : incomes.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No income entries for this month</p>
              <p className="text-slate-500 text-sm">Click "Add Income" to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {incomes.map((income, index) => (
                  <motion.div
                    key={income.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800/70 transition-colors"
                    data-testid={`income-item-${income.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-white font-medium">{income.source}</p>
                          {income.is_recurring && (
                            <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded-full">
                              Recurring
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500 text-sm">
                          {format(new Date(income.date), "MMM d, yyyy")}
                          {income.description && ` • ${income.description}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-emerald-400 font-medium">
                        {formatCAD(income.amount)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(income.id)}
                        className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                        data-testid={`delete-income-${income.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
