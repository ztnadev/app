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
  TrendingDown,
  CalendarIcon,
  RefreshCw,
  DollarSign,
  CreditCard,
  Banknote,
  ShoppingBag,
  Home,
  Car,
  Utensils,
  Heart,
  Gamepad2,
  GraduationCap,
  Plane
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

const formatCAD = (amount) => {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD'
  }).format(amount);
};

const EXPENSE_CATEGORIES = [
  { name: "Housing", icon: Home },
  { name: "Transportation", icon: Car },
  { name: "Food & Dining", icon: Utensils },
  { name: "Shopping", icon: ShoppingBag },
  { name: "Healthcare", icon: Heart },
  { name: "Entertainment", icon: Gamepad2 },
  { name: "Education", icon: GraduationCap },
  { name: "Travel", icon: Plane },
  { name: "Other", icon: TrendingDown }
];

const getCategoryIcon = (category) => {
  const cat = EXPENSE_CATEGORIES.find(c => c.name === category);
  return cat ? cat.icon : TrendingDown;
};

export default function Expenses() {
  const { token } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [creditCards, setCreditCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Form state
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date());
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [creditCardId, setCreditCardId] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [expensesRes, cardsRes] = await Promise.all([
        axios.get(`${API}/expenses?month=${selectedMonth}&year=${selectedYear}`, { headers }),
        axios.get(`${API}/credit-cards`, { headers })
      ]);
      setExpenses(expensesRes.data);
      setCreditCards(cardsRes.data);
    } catch (error) {
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!category || !amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await axios.post(`${API}/expenses`, {
        category,
        amount: parseFloat(amount),
        date: format(date, "yyyy-MM-dd"),
        description,
        payment_method: paymentMethod,
        credit_card_id: paymentMethod === "credit_card" ? creditCardId : null,
        is_recurring: isRecurring
      }, { headers });
      
      toast.success("Expense added successfully!");
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error("Failed to add expense");
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/expenses/${id}`, { headers });
      toast.success("Expense deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete expense");
    }
  };

  const resetForm = () => {
    setCategory("");
    setAmount("");
    setDate(new Date());
    setDescription("");
    setPaymentMethod("cash");
    setCreditCardId("");
    setIsRecurring(false);
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const getCardName = (cardId) => {
    const card = creditCards.find(c => c.id === cardId);
    return card ? `${card.name} (****${card.last_four_digits})` : '';
  };

  return (
    <div className="space-y-6" data-testid="expenses-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Expenses</h1>
          <p className="text-slate-400 mt-1">Track where your money goes</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800/50 rounded-xl p-1">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-transparent text-white px-3 py-2 rounded-lg focus:outline-none"
              data-testid="expenses-month-selector"
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
              data-testid="expenses-year-selector"
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
              <Button className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700" data-testid="add-expense-btn">
                <Plus className="w-4 h-4 mr-2" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white">Add Expense</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Category</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {EXPENSE_CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <button
                          key={cat.name}
                          type="button"
                          onClick={() => setCategory(cat.name)}
                          className={`p-3 rounded-xl border transition-all ${
                            category === cat.name
                              ? 'border-pink-500 bg-pink-500/20 text-pink-400'
                              : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                          }`}
                          data-testid={`category-${cat.name.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          <Icon className="w-5 h-5 mx-auto mb-1" />
                          <span className="text-xs">{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

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
                      data-testid="expense-amount-input"
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
                        data-testid="expense-date-btn"
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
                  <Label className="text-slate-300">Payment Method</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("cash")}
                      className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                        paymentMethod === "cash"
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                          : 'border-slate-700 bg-slate-800/50 text-slate-400'
                      }`}
                      data-testid="payment-cash"
                    >
                      <Banknote className="w-5 h-5" />
                      <span>Cash</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("credit_card")}
                      className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                        paymentMethod === "credit_card"
                          ? 'border-purple-500 bg-purple-500/20 text-purple-400'
                          : 'border-slate-700 bg-slate-800/50 text-slate-400'
                      }`}
                      data-testid="payment-credit-card"
                    >
                      <CreditCard className="w-5 h-5" />
                      <span>Card</span>
                    </button>
                  </div>
                </div>

                {paymentMethod === "credit_card" && (
                  <div className="space-y-2">
                    <Label className="text-slate-300">Select Card</Label>
                    <select
                      value={creditCardId}
                      onChange={(e) => setCreditCardId(e.target.value)}
                      className="w-full bg-slate-800 border-slate-700 text-white rounded-lg p-2"
                      required
                      data-testid="expense-card-select"
                    >
                      <option value="">Select a card</option>
                      {creditCards.map((card) => (
                        <option key={card.id} value={card.id}>
                          {card.name} (****{card.last_four_digits})
                        </option>
                      ))}
                    </select>
                    {creditCards.length === 0 && (
                      <p className="text-yellow-400 text-sm">
                        No cards added. Add one in Credit Cards page.
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-slate-300">Description (optional)</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                    placeholder="Add a note..."
                    data-testid="expense-description-input"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-pink-400" />
                    <span className="text-slate-300">Recurring expense</span>
                  </div>
                  <Switch
                    checked={isRecurring}
                    onCheckedChange={setIsRecurring}
                    data-testid="expense-recurring-switch"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-pink-600 to-purple-600"
                  data-testid="expense-submit-btn"
                >
                  Add Expense
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="glass-card neon-border-pink" data-testid="expenses-summary-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm uppercase tracking-wider">Total Expenses</p>
              <p className="text-3xl font-bold text-pink-400 font-mono mt-1">
                {formatCAD(totalExpenses)}
              </p>
              <p className="text-slate-500 text-sm mt-1">
                {expenses.length} transaction{expenses.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="w-16 h-16 bg-pink-500/20 rounded-2xl flex items-center justify-center">
              <TrendingDown className="w-8 h-8 text-pink-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses List */}
      <Card className="glass-card" data-testid="expenses-list-card">
        <CardHeader>
          <CardTitle className="text-white">Expense Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pink-500"></div>
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-12">
              <TrendingDown className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No expenses for this month</p>
              <p className="text-slate-500 text-sm">Click "Add Expense" to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {expenses.map((expense, index) => {
                  const Icon = getCategoryIcon(expense.category);
                  return (
                    <motion.div
                      key={expense.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800/70 transition-colors"
                      data-testid={`expense-item-${expense.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-pink-500/20 rounded-xl flex items-center justify-center">
                          <Icon className="w-5 h-5 text-pink-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-white font-medium">{expense.category}</p>
                            {expense.is_recurring && (
                              <span className="px-2 py-0.5 bg-pink-500/20 text-pink-400 text-xs rounded-full">
                                Recurring
                              </span>
                            )}
                          </div>
                          <p className="text-slate-500 text-sm">
                            {format(new Date(expense.date), "MMM d, yyyy")}
                            {expense.payment_method === "credit_card" && expense.credit_card_id && (
                              <> • {getCardName(expense.credit_card_id)}</>
                            )}
                            {expense.payment_method === "cash" && " • Cash"}
                            {expense.description && ` • ${expense.description}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-pink-400 font-medium">
                          -{formatCAD(expense.amount)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(expense.id)}
                          className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                          data-testid={`delete-expense-${expense.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
