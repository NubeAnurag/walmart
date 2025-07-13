# Login System Testing Guide

## 🔐 Test Credentials

The following test accounts have been created for testing the login system:

### 1. Admin Login
- **URL**: http://localhost:3000/admin/login
- **Email**: `alexmorgan34@gmail.com`
- **Password**: `walmart047@admin_login`
- **Role**: admin

### 2. Customer Login  
- **URL**: http://localhost:3000/login (select Customer)
- **Email**: `customer@test.com`
- **Password**: `password123`
- **Role**: customer

### 3. Manager Login
- **URL**: http://localhost:3000/manager/login
- **Email**: `manager@test.com`
- **Password**: `password123`
- **Role**: manager

### 4. Staff Login (Cashier)
- **URL**: http://localhost:3000/staff/login
- **Email**: `cashier@test.com`
- **Password**: `password123`
- **Role**: staff
- **Staff Type**: cashier

### 5. Staff Login (Inventory)
- **URL**: http://localhost:3000/staff/login
- **Email**: `inventory@test.com`
- **Password**: `password123`
- **Role**: staff
- **Staff Type**: inventory

### 6. Supplier Login
- **URL**: http://localhost:3000/supplier/login
- **Email**: `supplier@test.com`
- **Password**: `password123`
- **Role**: supplier

## 🧪 Testing Steps

### Step 1: Test Basic Login Flow
1. Navigate to http://localhost:3000
2. Click on each user type (Customer, Manager, Staff, Supplier)
3. Enter the credentials from above
4. Verify successful login and redirect to appropriate dashboard

### Step 2: Test Validation Errors
1. Try logging in with empty fields
2. Try logging in with invalid email format
3. Try logging in with wrong password
4. Try logging in with correct credentials but wrong role
5. For staff login, try without selecting staff type

### Step 3: Test Role-Based Access
1. Login as each role
2. Verify that users are redirected to their specific dashboard
3. Try accessing other role dashboards while logged in (should redirect to correct dashboard)

### Step 4: Test Error Handling
1. Turn off backend server
2. Try logging in (should show network error)
3. Turn backend back on
4. Try logging in with incorrect credentials (should show validation errors)

## 🔧 Fixes Applied

### Backend Fixes:
1. **Created Test Users**: Added test users for all roles with proper validation
2. **Database Seeding**: Ensured all required stores and users are created
3. **Validation Middleware**: Fixed login validation to properly handle all roles
4. **Error Handling**: Enhanced error messages for better debugging

### Frontend Fixes:
1. **Error Display**: Added proper validation error display in login forms
2. **API Error Handling**: Enhanced error parsing and display
3. **Role Validation**: Improved role-based login validation
4. **Network Error Handling**: Better handling of connection issues

## 🚨 Common Issues and Solutions

### Issue 1: "Network Error"
**Solution**: Make sure the backend server is running on port 5001
```bash
cd backend
npm run dev
```

### Issue 2: "Invalid email or password"
**Solution**: Use the exact credentials listed above

### Issue 3: "Role validation error"
**Solution**: Make sure you're selecting the correct role for each user

### Issue 4: "Staff type required"
**Solution**: For staff login, select either "cashier" or "inventory"

### Issue 5: Database not seeded
**Solution**: Run the seeding scripts
```bash
cd backend
node database/seedData.js
node database/createTestUsers.js
```

## 📝 Notes

- All passwords are set to `password123` for test accounts
- Admin password is `walmart047@admin_login`
- Make sure both frontend (port 3000) and backend (port 5001) are running
- Check browser console for detailed error messages during troubleshooting
- All test users are created with proper store associations and employee IDs where required 