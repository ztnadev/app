from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import calendar

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security setup
SECRET_KEY = os.environ.get('JWT_SECRET', 'expense-tracker-secret-key-2024')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app
app = FastAPI(title="Expense Tracker API")
api_router = APIRouter(prefix="/api")

# ============== MODELS ==============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class IncomeCreate(BaseModel):
    source: str
    amount: float
    date: str
    description: Optional[str] = ""
    is_recurring: bool = False

class IncomeResponse(BaseModel):
    id: str
    user_id: str
    source: str
    amount: float
    date: str
    description: str
    is_recurring: bool
    created_at: str

class ExpenseCreate(BaseModel):
    category: str
    amount: float
    date: str
    description: Optional[str] = ""
    payment_method: str = "cash"
    credit_card_id: Optional[str] = None
    is_recurring: bool = False

class ExpenseResponse(BaseModel):
    id: str
    user_id: str
    category: str
    amount: float
    date: str
    description: str
    payment_method: str
    credit_card_id: Optional[str]
    is_recurring: bool
    created_at: str

class BudgetCreate(BaseModel):
    month: int
    year: int
    total_budget: float
    category_budgets: dict = {}

class BudgetResponse(BaseModel):
    id: str
    user_id: str
    month: int
    year: int
    total_budget: float
    category_budgets: dict
    created_at: str

class CreditCardCreate(BaseModel):
    name: str
    last_four_digits: str
    card_type: str = "Visa"

class CreditCardResponse(BaseModel):
    id: str
    user_id: str
    name: str
    last_four_digits: str
    card_type: str
    created_at: str

class RecurringItemCreate(BaseModel):
    item_type: str  # "income" or "expense"
    category: Optional[str] = None
    source: Optional[str] = None
    amount: float
    description: Optional[str] = ""
    payment_method: Optional[str] = "cash"
    credit_card_id: Optional[str] = None
    day_of_month: int = 1

class RecurringItemResponse(BaseModel):
    id: str
    user_id: str
    item_type: str
    category: Optional[str]
    source: Optional[str]
    amount: float
    description: str
    payment_method: Optional[str]
    credit_card_id: Optional[str]
    day_of_month: int
    is_active: bool
    created_at: str

# ============== AUTH HELPERS ==============

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password": get_password_hash(user_data.password),
        "created_at": now
    }
    await db.users.insert_one(user_doc)
    
    access_token = create_access_token({"sub": user_id})
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=user_id,
            email=user_data.email,
            name=user_data.name,
            created_at=now
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token({"sub": user["id"]})
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)

# ============== INCOME ROUTES ==============

@api_router.post("/income", response_model=IncomeResponse)
async def create_income(income: IncomeCreate, current_user: dict = Depends(get_current_user)):
    income_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    income_doc = {
        "id": income_id,
        "user_id": current_user["id"],
        "source": income.source,
        "amount": income.amount,
        "date": income.date,
        "description": income.description or "",
        "is_recurring": income.is_recurring,
        "created_at": now
    }
    await db.income.insert_one(income_doc)
    
    return IncomeResponse(**{k: v for k, v in income_doc.items() if k != "_id"})

@api_router.get("/income", response_model=List[IncomeResponse])
async def get_income(
    month: Optional[int] = None,
    year: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": current_user["id"]}
    
    if month and year:
        start_date = f"{year}-{month:02d}-01"
        last_day = calendar.monthrange(year, month)[1]
        end_date = f"{year}-{month:02d}-{last_day}"
        query["date"] = {"$gte": start_date, "$lte": end_date}
    
    incomes = await db.income.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return [IncomeResponse(**inc) for inc in incomes]

@api_router.delete("/income/{income_id}")
async def delete_income(income_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.income.delete_one({"id": income_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Income not found")
    return {"message": "Income deleted"}

# ============== EXPENSE ROUTES ==============

@api_router.post("/expenses", response_model=ExpenseResponse)
async def create_expense(expense: ExpenseCreate, current_user: dict = Depends(get_current_user)):
    expense_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    expense_doc = {
        "id": expense_id,
        "user_id": current_user["id"],
        "category": expense.category,
        "amount": expense.amount,
        "date": expense.date,
        "description": expense.description or "",
        "payment_method": expense.payment_method,
        "credit_card_id": expense.credit_card_id,
        "is_recurring": expense.is_recurring,
        "created_at": now
    }
    await db.expenses.insert_one(expense_doc)
    
    return ExpenseResponse(**{k: v for k, v in expense_doc.items() if k != "_id"})

@api_router.get("/expenses", response_model=List[ExpenseResponse])
async def get_expenses(
    month: Optional[int] = None,
    year: Optional[int] = None,
    category: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": current_user["id"]}
    
    if month and year:
        start_date = f"{year}-{month:02d}-01"
        last_day = calendar.monthrange(year, month)[1]
        end_date = f"{year}-{month:02d}-{last_day}"
        query["date"] = {"$gte": start_date, "$lte": end_date}
    
    if category:
        query["category"] = category
    
    expenses = await db.expenses.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return [ExpenseResponse(**exp) for exp in expenses]

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.expenses.delete_one({"id": expense_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"message": "Expense deleted"}

# ============== BUDGET ROUTES ==============

@api_router.post("/budgets", response_model=BudgetResponse)
async def create_or_update_budget(budget: BudgetCreate, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    
    existing = await db.budgets.find_one({
        "user_id": current_user["id"],
        "month": budget.month,
        "year": budget.year
    })
    
    if existing:
        await db.budgets.update_one(
            {"id": existing["id"]},
            {"$set": {
                "total_budget": budget.total_budget,
                "category_budgets": budget.category_budgets
            }}
        )
        budget_id = existing["id"]
        created_at = existing["created_at"]
    else:
        budget_id = str(uuid.uuid4())
        created_at = now
        budget_doc = {
            "id": budget_id,
            "user_id": current_user["id"],
            "month": budget.month,
            "year": budget.year,
            "total_budget": budget.total_budget,
            "category_budgets": budget.category_budgets,
            "created_at": created_at
        }
        await db.budgets.insert_one(budget_doc)
    
    return BudgetResponse(
        id=budget_id,
        user_id=current_user["id"],
        month=budget.month,
        year=budget.year,
        total_budget=budget.total_budget,
        category_budgets=budget.category_budgets,
        created_at=created_at
    )

@api_router.get("/budgets", response_model=Optional[BudgetResponse])
async def get_budget(
    month: int,
    year: int,
    current_user: dict = Depends(get_current_user)
):
    budget = await db.budgets.find_one({
        "user_id": current_user["id"],
        "month": month,
        "year": year
    }, {"_id": 0})
    
    if budget:
        return BudgetResponse(**budget)
    return None

@api_router.get("/budgets/alerts")
async def get_budget_alerts(
    month: int,
    year: int,
    current_user: dict = Depends(get_current_user)
):
    budget = await db.budgets.find_one({
        "user_id": current_user["id"],
        "month": month,
        "year": year
    }, {"_id": 0})
    
    if not budget:
        return {"alerts": [], "total_spent": 0, "budget": 0, "percentage": 0}
    
    start_date = f"{year}-{month:02d}-01"
    last_day = calendar.monthrange(year, month)[1]
    end_date = f"{year}-{month:02d}-{last_day}"
    
    expenses = await db.expenses.find({
        "user_id": current_user["id"],
        "date": {"$gte": start_date, "$lte": end_date}
    }, {"_id": 0}).to_list(1000)
    
    total_spent = sum(exp["amount"] for exp in expenses)
    percentage = (total_spent / budget["total_budget"] * 100) if budget["total_budget"] > 0 else 0
    
    alerts = []
    if percentage >= 100:
        alerts.append({"type": "danger", "message": f"You've exceeded your budget! Spent ${total_spent:.2f} of ${budget['total_budget']:.2f}"})
    elif percentage >= 80:
        alerts.append({"type": "warning", "message": f"You've used {percentage:.1f}% of your budget. ${budget['total_budget'] - total_spent:.2f} remaining."})
    
    # Category alerts
    category_spending = {}
    for exp in expenses:
        cat = exp["category"]
        category_spending[cat] = category_spending.get(cat, 0) + exp["amount"]
    
    for cat, spent in category_spending.items():
        if cat in budget.get("category_budgets", {}):
            cat_budget = budget["category_budgets"][cat]
            cat_percentage = (spent / cat_budget * 100) if cat_budget > 0 else 0
            if cat_percentage >= 100:
                alerts.append({"type": "danger", "message": f"{cat}: Budget exceeded! Spent ${spent:.2f} of ${cat_budget:.2f}"})
            elif cat_percentage >= 80:
                alerts.append({"type": "warning", "message": f"{cat}: {cat_percentage:.1f}% used. ${cat_budget - spent:.2f} remaining."})
    
    return {
        "alerts": alerts,
        "total_spent": total_spent,
        "budget": budget["total_budget"],
        "percentage": percentage
    }

# ============== CREDIT CARD ROUTES ==============

@api_router.post("/credit-cards", response_model=CreditCardResponse)
async def create_credit_card(card: CreditCardCreate, current_user: dict = Depends(get_current_user)):
    card_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    card_doc = {
        "id": card_id,
        "user_id": current_user["id"],
        "name": card.name,
        "last_four_digits": card.last_four_digits,
        "card_type": card.card_type,
        "created_at": now
    }
    await db.credit_cards.insert_one(card_doc)
    
    return CreditCardResponse(**{k: v for k, v in card_doc.items() if k != "_id"})

@api_router.get("/credit-cards", response_model=List[CreditCardResponse])
async def get_credit_cards(current_user: dict = Depends(get_current_user)):
    cards = await db.credit_cards.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    return [CreditCardResponse(**card) for card in cards]

@api_router.delete("/credit-cards/{card_id}")
async def delete_credit_card(card_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.credit_cards.delete_one({"id": card_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Credit card not found")
    return {"message": "Credit card deleted"}

# ============== RECURRING ITEMS ROUTES ==============

@api_router.post("/recurring", response_model=RecurringItemResponse)
async def create_recurring_item(item: RecurringItemCreate, current_user: dict = Depends(get_current_user)):
    item_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    item_doc = {
        "id": item_id,
        "user_id": current_user["id"],
        "item_type": item.item_type,
        "category": item.category,
        "source": item.source,
        "amount": item.amount,
        "description": item.description or "",
        "payment_method": item.payment_method,
        "credit_card_id": item.credit_card_id,
        "day_of_month": item.day_of_month,
        "is_active": True,
        "created_at": now
    }
    await db.recurring_items.insert_one(item_doc)
    
    return RecurringItemResponse(**{k: v for k, v in item_doc.items() if k != "_id"})

@api_router.get("/recurring", response_model=List[RecurringItemResponse])
async def get_recurring_items(current_user: dict = Depends(get_current_user)):
    items = await db.recurring_items.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    return [RecurringItemResponse(**item) for item in items]

@api_router.delete("/recurring/{item_id}")
async def delete_recurring_item(item_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.recurring_items.delete_one({"id": item_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Recurring item not found")
    return {"message": "Recurring item deleted"}

@api_router.post("/recurring/process")
async def process_recurring_items(
    month: int,
    year: int,
    current_user: dict = Depends(get_current_user)
):
    """Process recurring items for the specified month"""
    items = await db.recurring_items.find({
        "user_id": current_user["id"],
        "is_active": True
    }, {"_id": 0}).to_list(100)
    
    processed = 0
    for item in items:
        day = min(item["day_of_month"], calendar.monthrange(year, month)[1])
        date = f"{year}-{month:02d}-{day:02d}"
        
        if item["item_type"] == "income":
            # Check if already exists
            existing = await db.income.find_one({
                "user_id": current_user["id"],
                "source": item["source"],
                "date": date,
                "is_recurring": True
            })
            if not existing:
                income_doc = {
                    "id": str(uuid.uuid4()),
                    "user_id": current_user["id"],
                    "source": item["source"],
                    "amount": item["amount"],
                    "date": date,
                    "description": item["description"],
                    "is_recurring": True,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.income.insert_one(income_doc)
                processed += 1
        else:
            existing = await db.expenses.find_one({
                "user_id": current_user["id"],
                "category": item["category"],
                "date": date,
                "is_recurring": True
            })
            if not existing:
                expense_doc = {
                    "id": str(uuid.uuid4()),
                    "user_id": current_user["id"],
                    "category": item["category"],
                    "amount": item["amount"],
                    "date": date,
                    "description": item["description"],
                    "payment_method": item["payment_method"],
                    "credit_card_id": item["credit_card_id"],
                    "is_recurring": True,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.expenses.insert_one(expense_doc)
                processed += 1
    
    return {"message": f"Processed {processed} recurring items"}

# ============== ANALYTICS ROUTES ==============

@api_router.get("/analytics/summary")
async def get_analytics_summary(
    month: int,
    year: int,
    current_user: dict = Depends(get_current_user)
):
    start_date = f"{year}-{month:02d}-01"
    last_day = calendar.monthrange(year, month)[1]
    end_date = f"{year}-{month:02d}-{last_day}"
    
    # Get income
    incomes = await db.income.find({
        "user_id": current_user["id"],
        "date": {"$gte": start_date, "$lte": end_date}
    }, {"_id": 0}).to_list(1000)
    total_income = sum(inc["amount"] for inc in incomes)
    
    # Get expenses
    expenses = await db.expenses.find({
        "user_id": current_user["id"],
        "date": {"$gte": start_date, "$lte": end_date}
    }, {"_id": 0}).to_list(1000)
    total_expenses = sum(exp["amount"] for exp in expenses)
    
    # Category breakdown
    category_breakdown = {}
    for exp in expenses:
        cat = exp["category"]
        category_breakdown[cat] = category_breakdown.get(cat, 0) + exp["amount"]
    
    # Payment method breakdown
    payment_breakdown = {}
    for exp in expenses:
        method = exp["payment_method"]
        payment_breakdown[method] = payment_breakdown.get(method, 0) + exp["amount"]
    
    # Income source breakdown
    income_breakdown = {}
    for inc in incomes:
        source = inc["source"]
        income_breakdown[source] = income_breakdown.get(source, 0) + inc["amount"]
    
    return {
        "total_income": total_income,
        "total_expenses": total_expenses,
        "net_savings": total_income - total_expenses,
        "category_breakdown": category_breakdown,
        "payment_breakdown": payment_breakdown,
        "income_breakdown": income_breakdown
    }

@api_router.get("/analytics/trends")
async def get_expense_trends(
    months: int = 6,
    current_user: dict = Depends(get_current_user)
):
    """Get expense trends for the last N months"""
    now = datetime.now(timezone.utc)
    trends = []
    
    for i in range(months - 1, -1, -1):
        target_date = now - timedelta(days=i * 30)
        month = target_date.month
        year = target_date.year
        
        start_date = f"{year}-{month:02d}-01"
        last_day = calendar.monthrange(year, month)[1]
        end_date = f"{year}-{month:02d}-{last_day}"
        
        # Get income
        incomes = await db.income.find({
            "user_id": current_user["id"],
            "date": {"$gte": start_date, "$lte": end_date}
        }, {"_id": 0}).to_list(1000)
        total_income = sum(inc["amount"] for inc in incomes)
        
        # Get expenses
        expenses = await db.expenses.find({
            "user_id": current_user["id"],
            "date": {"$gte": start_date, "$lte": end_date}
        }, {"_id": 0}).to_list(1000)
        total_expenses = sum(exp["amount"] for exp in expenses)
        
        trends.append({
            "month": month,
            "year": year,
            "month_name": calendar.month_abbr[month],
            "income": total_income,
            "expenses": total_expenses,
            "savings": total_income - total_expenses
        })
    
    return {"trends": trends}

@api_router.get("/analytics/category-trends")
async def get_category_trends(
    months: int = 6,
    current_user: dict = Depends(get_current_user)
):
    """Get category-wise expense trends"""
    now = datetime.now(timezone.utc)
    all_categories = set()
    monthly_data = []
    
    for i in range(months - 1, -1, -1):
        target_date = now - timedelta(days=i * 30)
        month = target_date.month
        year = target_date.year
        
        start_date = f"{year}-{month:02d}-01"
        last_day = calendar.monthrange(year, month)[1]
        end_date = f"{year}-{month:02d}-{last_day}"
        
        expenses = await db.expenses.find({
            "user_id": current_user["id"],
            "date": {"$gte": start_date, "$lte": end_date}
        }, {"_id": 0}).to_list(1000)
        
        category_totals = {"month_name": calendar.month_abbr[month]}
        for exp in expenses:
            cat = exp["category"]
            all_categories.add(cat)
            category_totals[cat] = category_totals.get(cat, 0) + exp["amount"]
        
        monthly_data.append(category_totals)
    
    return {"categories": list(all_categories), "data": monthly_data}

# ============== ROOT ROUTE ==============

@api_router.get("/")
async def root():
    return {"message": "Expense Tracker API", "version": "1.0.0"}

# Include router and setup middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
