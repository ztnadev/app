import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth, API } from "../App";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { 
  Plus, 
  Trash2, 
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const formatCAD = (amount) => {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD'
  }).format(amount);
};

const INCOME_SOURCES = ["Salary", "Freelance", "Investments", "Rental Income", "Side Business", "Dividends", "Bonus", "Other"];
const EXPENSE_CATEGORIES = ["Housing", "Transportation", "Food & Dining", "Shopping", "Healthcare", "Entertainment", "Education", "Travel", "Other"];

export default function Recurring() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [creditCards, setCreditCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Form state
  const [itemType, setItemType] = useState("expense");
  const [category, setCategory] = useState("");
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [creditCardId, setCreditCardId] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState("1");

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [itemsRes, cardsRes] = await Promise.all([
        axios.get(`${API}/recurring`, { headers }),
        axios.get(`${API}/credit-cards`, { headers })
      ]);
      setItems(itemsRes.data);
      setCreditCards(cardsRes.data);
    } catch (error) {
      toast.error("Failed to load recurring items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (itemType === "income" && !source) {
      toast.error("Please select an income source");
      return;
    }
    if (itemType === "expense" && !category) {
      toast.error("Please select a category");
      return;
    }
    if (!amount) {
      toast.error("Please enter an amount");
      return;
    }

    try {
      await axios.post(`${API}/recurring`, {
        item_type: itemType,
        category: itemType === "expense" ? category : null,
        source: itemType === "income" ? source : null,
        amount: parseFloat(amount),
        description,
        payment_method: itemType === "expense" ? paymentMethod : null,
        credit_card_id: itemType === "expense" && paymentMethod === "credit_card" ? creditCardId : null,
        day_of_month: parseInt(dayOfMonth)
      }, { headers });
      
      toast.success("Recurring item added!");
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error("Failed to add recurring item");
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/recurring/${id}`, { headers });
      toast.success("Recurring item deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete item");
    }
  };

  const resetForm = () => {
    setItemType("expense");
    setCategory("");
    setSource("");
    setAmount("");
    setDescription("");
    setPaymentMethod("cash");
    setCreditCardId("");
    setDayOfMonth("1");
  };

  const incomeItems = items.filter(i => i.item_type === "income");
  const expenseItems = items.filter(i => i.item_type === "expense");

  return (
    <div className="space-y-6" data-testid="recurring-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Recurring Items</h1>
          <p className="text-slate-400 mt-1">Manage automatic monthly entries</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700" data-testid="add-recurring-btn">
              <Plus className="w-4 h-4 mr-2" />
              Add Recurring
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-700 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Add Recurring Item</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type Selection */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setItemType("income")}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                    itemType === "income"
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                      : 'border-slate-700 bg-slate-800/50 text-slate-400'
                  }`}
                  data-testid="recurring-type-income"
                >
                  <TrendingUp className="w-5 h-5" />
                  <span>Income</span>
                </button>
                <button
                  type="button"
                  onClick={() => setItemType("expense")}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                    itemType === "expense"
                      ? 'border-pink-500 bg-pink-500/20 text-pink-400'
                      : 'border-slate-700 bg-slate-800/50 text-slate-400'
                  }`}
                  data-testid="recurring-type-expense"
                >
                  <TrendingDown className="w-5 h-5" />
                  <span>Expense</span>
                </button>
              </div>

              {/* Source/Category */}
              {itemType === "income" ? (
                <div className="space-y-2">
                  <Label className="text-slate-300">Income Source</Label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full bg-slate-800 border-slate-700 text-white rounded-lg p-2"
                    required
                    data-testid="recurring-source-select"
                  >
                    <option value="">Select source</option>
                    {INCOME_SOURCES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-slate-300">Category</Label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-800 border-slate-700 text-white rounded-lg p-2"
                    required
                    data-testid="recurring-category-select"
                  >
                    <option value="">Select category</option>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Amount */}
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
                    data-testid="recurring-amount-input"
                  />
                </div>
              </div>

              {/* Day of Month */}
              <div className="space-y-2">
                <Label className="text-slate-300">Day of Month</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(e.target.value)}
                    className="pl-10 bg-slate-800 border-slate-700 text-white"
                    data-testid="recurring-day-input"
                  />
                </div>
                <p className="text-xs text-slate-500">Item will be added on this day each month</p>
              </div>

              {/* Payment Method (for expenses) */}
              {itemType === "expense" && (
                <>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Payment Method</Label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full bg-slate-800 border-slate-700 text-white rounded-lg p-2"
                      data-testid="recurring-payment-select"
                    >
                      <option value="cash">Cash</option>
                      <option value="credit_card">Credit Card</option>
                    </select>
                  </div>

                  {paymentMethod === "credit_card" && (
                    <div className="space-y-2">
                      <Label className="text-slate-300">Select Card</Label>
                      <select
                        value={creditCardId}
                        onChange={(e) => setCreditCardId(e.target.value)}
                        className="w-full bg-slate-800 border-slate-700 text-white rounded-lg p-2"
                        required
                        data-testid="recurring-card-select"
                      >
                        <option value="">Select a card</option>
                        {creditCards.map((card) => (
                          <option key={card.id} value={card.id}>
                            {card.name} (****{card.last_four_digits})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-slate-300">Description (optional)</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="Add a note..."
                  data-testid="recurring-description-input"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-cyan-600 to-purple-600"
                data-testid="recurring-submit-btn"
              >
                Add Recurring Item
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="glass-card neon-border" data-testid="recurring-income-summary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm uppercase tracking-wider">Monthly Recurring Income</p>
                <p className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                  {formatCAD(incomeItems.reduce((sum, i) => sum + i.amount, 0))}
                </p>
                <p className="text-slate-500 text-sm">{incomeItems.length} item{incomeItems.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card neon-border-pink" data-testid="recurring-expense-summary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm uppercase tracking-wider">Monthly Recurring Expenses</p>
                <p className="text-2xl font-bold text-pink-400 font-mono mt-1">
                  {formatCAD(expenseItems.reduce((sum, i) => sum + i.amount, 0))}
                </p>
                <p className="text-slate-500 text-sm">{expenseItems.length} item{expenseItems.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-pink-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recurring Items List */}
      <Card className="glass-card" data-testid="recurring-list-card">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-cyan-400" />
            Recurring Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="bg-slate-800/50 mb-4">
              <TabsTrigger value="all" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
                All ({items.length})
              </TabsTrigger>
              <TabsTrigger value="income" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
                Income ({incomeItems.length})
              </TabsTrigger>
              <TabsTrigger value="expense" className="data-[state=active]:bg-pink-500/20 data-[state=active]:text-pink-400">
                Expenses ({expenseItems.length})
              </TabsTrigger>
            </TabsList>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12">
                <RefreshCw className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No recurring items</p>
                <p className="text-slate-500 text-sm">Add items that repeat monthly</p>
              </div>
            ) : (
              <>
                <TabsContent value="all">
                  <ItemsList items={items} onDelete={handleDelete} creditCards={creditCards} />
                </TabsContent>
                <TabsContent value="income">
                  <ItemsList items={incomeItems} onDelete={handleDelete} creditCards={creditCards} />
                </TabsContent>
                <TabsContent value="expense">
                  <ItemsList items={expenseItems} onDelete={handleDelete} creditCards={creditCards} />
                </TabsContent>
              </>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function ItemsList({ items, onDelete, creditCards }) {
  const getCardName = (cardId) => {
    const card = creditCards.find(c => c.id === cardId);
    return card ? `${card.name} (****${card.last_four_digits})` : '';
  };

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800/70 transition-colors"
            data-testid={`recurring-item-${item.id}`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                item.item_type === "income" 
                  ? "bg-emerald-500/20" 
                  : "bg-pink-500/20"
              }`}>
                {item.item_type === "income" ? (
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-pink-400" />
                )}
              </div>
              <div>
                <p className="text-white font-medium">
                  {item.item_type === "income" ? item.source : item.category}
                </p>
                <p className="text-slate-500 text-sm">
                  Day {item.day_of_month} of each month
                  {item.item_type === "expense" && item.payment_method === "credit_card" && item.credit_card_id && (
                    <> • {getCardName(item.credit_card_id)}</>
                  )}
                  {item.description && ` • ${item.description}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className={`font-mono font-medium ${
                item.item_type === "income" ? "text-emerald-400" : "text-pink-400"
              }`}>
                {item.item_type === "income" ? "+" : "-"}
                {new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(item.amount)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(item.id)}
                className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                data-testid={`delete-recurring-${item.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
