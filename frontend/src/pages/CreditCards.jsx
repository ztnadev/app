import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth, API } from "../App";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { 
  Plus, 
  Trash2, 
  CreditCard,
  Wallet
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const CARD_TYPES = ["Visa", "Mastercard", "American Express", "Discover", "Other"];

const getCardGradient = (type) => {
  switch (type) {
    case "Visa":
      return "from-blue-600 to-blue-800";
    case "Mastercard":
      return "from-orange-500 to-red-600";
    case "American Express":
      return "from-slate-600 to-slate-800";
    case "Discover":
      return "from-orange-400 to-yellow-500";
    default:
      return "from-purple-600 to-pink-600";
  }
};

export default function CreditCards() {
  const { token } = useAuth();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Form state
  const [name, setName] = useState("");
  const [lastFourDigits, setLastFourDigits] = useState("");
  const [cardType, setCardType] = useState("Visa");

  const headers = { Authorization: `Bearer ${token}` };

  const fetchCards = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/credit-cards`, { headers });
      setCards(response.data);
    } catch (error) {
      toast.error("Failed to load credit cards");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name || !lastFourDigits) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (lastFourDigits.length !== 4 || !/^\d{4}$/.test(lastFourDigits)) {
      toast.error("Please enter exactly 4 digits");
      return;
    }

    try {
      await axios.post(`${API}/credit-cards`, {
        name,
        last_four_digits: lastFourDigits,
        card_type: cardType
      }, { headers });
      
      toast.success("Credit card added successfully!");
      setDialogOpen(false);
      resetForm();
      fetchCards();
    } catch (error) {
      toast.error("Failed to add credit card");
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/credit-cards/${id}`, { headers });
      toast.success("Credit card deleted");
      fetchCards();
    } catch (error) {
      toast.error("Failed to delete credit card");
    }
  };

  const resetForm = () => {
    setName("");
    setLastFourDigits("");
    setCardType("Visa");
  };

  return (
    <div className="space-y-6" data-testid="credit-cards-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Credit Cards</h1>
          <p className="text-slate-400 mt-1">Manage your payment cards</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700" data-testid="add-card-btn">
              <Plus className="w-4 h-4 mr-2" />
              Add Card
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Add Credit Card</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Card Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="e.g., Personal Visa"
                  required
                  data-testid="card-name-input"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Last 4 Digits</Label>
                <Input
                  value={lastFourDigits}
                  onChange={(e) => setLastFourDigits(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="bg-slate-800 border-slate-700 text-white font-mono tracking-wider"
                  placeholder="1234"
                  maxLength={4}
                  required
                  data-testid="card-digits-input"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Card Type</Label>
                <select
                  value={cardType}
                  onChange={(e) => setCardType(e.target.value)}
                  className="w-full bg-slate-800 border-slate-700 text-white rounded-lg p-2"
                  data-testid="card-type-select"
                >
                  {CARD_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Card Preview */}
              <div className={`p-6 rounded-2xl bg-gradient-to-br ${getCardGradient(cardType)} shadow-xl`}>
                <div className="flex justify-between items-start mb-8">
                  <Wallet className="w-8 h-8 text-white/80" />
                  <span className="text-white/80 font-medium">{cardType}</span>
                </div>
                <div className="text-white font-mono text-xl tracking-widest mb-4">
                  •••• •••• •••• {lastFourDigits || "••••"}
                </div>
                <div className="text-white/80 uppercase text-sm">
                  {name || "Card Name"}
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
                data-testid="card-submit-btn"
              >
                Add Card
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      ) : cards.length === 0 ? (
        <Card className="glass-card" data-testid="no-cards-message">
          <CardContent className="py-12">
            <div className="text-center">
              <CreditCard className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 mb-2">No credit cards added</p>
              <p className="text-slate-500 text-sm">Add your cards to track credit card expenses</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {cards.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.1 }}
                data-testid={`card-${card.id}`}
              >
                <div className={`relative p-6 rounded-2xl bg-gradient-to-br ${getCardGradient(card.card_type)} shadow-xl card-hover`}>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(card.id)}
                    className="absolute top-4 right-4 text-white/60 hover:text-white hover:bg-white/10"
                    data-testid={`delete-card-${card.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  
                  <div className="flex justify-between items-start mb-8">
                    <Wallet className="w-8 h-8 text-white/80" />
                    <span className="text-white/80 font-medium">{card.card_type}</span>
                  </div>
                  
                  <div className="text-white font-mono text-xl tracking-widest mb-4">
                    •••• •••• •••• {card.last_four_digits}
                  </div>
                  
                  <div className="text-white/80 uppercase text-sm">
                    {card.name}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
