import requests
import sys
import json
from datetime import datetime, timedelta
import calendar

class ExpenseTrackerAPITester:
    def __init__(self, base_url="https://fintracker-214.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data storage
        self.test_income_id = None
        self.test_expense_id = None
        self.test_card_id = None
        self.test_recurring_id = None

    def log_result(self, test_name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name} - PASSED")
        else:
            print(f"❌ {test_name} - FAILED: {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                try:
                    response_data = response.json()
                    self.log_result(name, True)
                    return True, response_data
                except:
                    self.log_result(name, True, "No JSON response")
                    return True, {}
            else:
                self.log_result(name, False, f"Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error details: {error_data}")
                except:
                    print(f"   Response text: {response.text[:200]}")
                return False, {}

        except Exception as e:
            self.log_result(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test(
            "Root API Endpoint",
            "GET",
            "",
            200
        )
        return success

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        test_email = f"test_user_{timestamp}@example.com"
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={
                "email": test_email,
                "password": "TestPass123!",
                "name": f"Test User {timestamp}"
            }
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            print(f"   Registered user: {test_email}")
            return True
        return False

    def test_user_login(self):
        """Test user login with existing credentials"""
        if not self.token:
            return False
            
        # Test getting current user info first
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_income_operations(self):
        """Test income CRUD operations"""
        # Create income
        success, response = self.run_test(
            "Create Income",
            "POST",
            "income",
            200,
            data={
                "source": "Salary",
                "amount": 5000.00,
                "date": "2024-12-01",
                "description": "Monthly salary",
                "is_recurring": False
            }
        )
        
        if success and 'id' in response:
            self.test_income_id = response['id']
        
        # Get income list
        current_month = datetime.now().month
        current_year = datetime.now().year
        success2, _ = self.run_test(
            "Get Income List",
            "GET",
            f"income?month={current_month}&year={current_year}",
            200
        )
        
        # Delete income if created
        success3 = True
        if self.test_income_id:
            success3, _ = self.run_test(
                "Delete Income",
                "DELETE",
                f"income/{self.test_income_id}",
                200
            )
        
        return success and success2 and success3

    def test_expense_operations(self):
        """Test expense CRUD operations"""
        # Create expense
        success, response = self.run_test(
            "Create Expense",
            "POST",
            "expenses",
            200,
            data={
                "category": "Food & Dining",
                "amount": 50.00,
                "date": "2024-12-01",
                "description": "Lunch",
                "payment_method": "cash",
                "is_recurring": False
            }
        )
        
        if success and 'id' in response:
            self.test_expense_id = response['id']
        
        # Get expenses list
        current_month = datetime.now().month
        current_year = datetime.now().year
        success2, _ = self.run_test(
            "Get Expenses List",
            "GET",
            f"expenses?month={current_month}&year={current_year}",
            200
        )
        
        # Delete expense if created
        success3 = True
        if self.test_expense_id:
            success3, _ = self.run_test(
                "Delete Expense",
                "DELETE",
                f"expenses/{self.test_expense_id}",
                200
            )
        
        return success and success2 and success3

    def test_credit_card_operations(self):
        """Test credit card CRUD operations"""
        # Create credit card
        success, response = self.run_test(
            "Create Credit Card",
            "POST",
            "credit-cards",
            200,
            data={
                "name": "Test Visa",
                "last_four_digits": "1234",
                "card_type": "Visa"
            }
        )
        
        if success and 'id' in response:
            self.test_card_id = response['id']
        
        # Get credit cards list
        success2, _ = self.run_test(
            "Get Credit Cards List",
            "GET",
            "credit-cards",
            200
        )
        
        # Delete credit card if created
        success3 = True
        if self.test_card_id:
            success3, _ = self.run_test(
                "Delete Credit Card",
                "DELETE",
                f"credit-cards/{self.test_card_id}",
                200
            )
        
        return success and success2 and success3

    def test_budget_operations(self):
        """Test budget operations"""
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        # Create/Update budget
        success, response = self.run_test(
            "Create/Update Budget",
            "POST",
            "budgets",
            200,
            data={
                "month": current_month,
                "year": current_year,
                "total_budget": 3000.00,
                "category_budgets": {
                    "Food & Dining": 500.00,
                    "Transportation": 300.00
                }
            }
        )
        
        # Get budget
        success2, _ = self.run_test(
            "Get Budget",
            "GET",
            f"budgets?month={current_month}&year={current_year}",
            200
        )
        
        # Get budget alerts
        success3, _ = self.run_test(
            "Get Budget Alerts",
            "GET",
            f"budgets/alerts?month={current_month}&year={current_year}",
            200
        )
        
        return success and success2 and success3

    def test_recurring_operations(self):
        """Test recurring items operations"""
        # Create recurring item
        success, response = self.run_test(
            "Create Recurring Item",
            "POST",
            "recurring",
            200,
            data={
                "item_type": "expense",
                "category": "Housing",
                "amount": 1200.00,
                "description": "Monthly rent",
                "payment_method": "cash",
                "day_of_month": 1
            }
        )
        
        if success and 'id' in response:
            self.test_recurring_id = response['id']
        
        # Get recurring items
        success2, _ = self.run_test(
            "Get Recurring Items",
            "GET",
            "recurring",
            200
        )
        
        # Process recurring items
        current_month = datetime.now().month
        current_year = datetime.now().year
        success3, _ = self.run_test(
            "Process Recurring Items",
            "POST",
            f"recurring/process?month={current_month}&year={current_year}",
            200
        )
        
        # Delete recurring item if created
        success4 = True
        if self.test_recurring_id:
            success4, _ = self.run_test(
                "Delete Recurring Item",
                "DELETE",
                f"recurring/{self.test_recurring_id}",
                200
            )
        
        return success and success2 and success3 and success4

    def test_analytics_operations(self):
        """Test analytics endpoints"""
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        # Get analytics summary
        success, _ = self.run_test(
            "Get Analytics Summary",
            "GET",
            f"analytics/summary?month={current_month}&year={current_year}",
            200
        )
        
        # Get expense trends
        success2, _ = self.run_test(
            "Get Expense Trends",
            "GET",
            "analytics/trends?months=6",
            200
        )
        
        # Get category trends
        success3, _ = self.run_test(
            "Get Category Trends",
            "GET",
            "analytics/category-trends?months=6",
            200
        )
        
        return success and success2 and success3

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Expense Tracker API Tests...")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Test sequence
        tests = [
            ("Root Endpoint", self.test_root_endpoint),
            ("User Registration", self.test_user_registration),
            ("User Authentication", self.test_user_login),
            ("Income Operations", self.test_income_operations),
            ("Expense Operations", self.test_expense_operations),
            ("Credit Card Operations", self.test_credit_card_operations),
            ("Budget Operations", self.test_budget_operations),
            ("Recurring Operations", self.test_recurring_operations),
            ("Analytics Operations", self.test_analytics_operations),
        ]
        
        for test_name, test_func in tests:
            print(f"\n📋 Testing {test_name}...")
            try:
                test_func()
            except Exception as e:
                self.log_result(f"{test_name} (Exception)", False, str(e))
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed. Check the details above.")
            
            # Print failed tests
            failed_tests = [r for r in self.test_results if not r['success']]
            if failed_tests:
                print("\n❌ Failed Tests:")
                for test in failed_tests:
                    print(f"   - {test['test']}: {test['details']}")
            
            return 1

def main():
    tester = ExpenseTrackerAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())