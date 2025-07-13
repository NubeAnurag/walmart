# Supplier Product Catalogue Integration

## Overview

This document explains how the Supplier Product Catalogue integration works in the Walmart Digital Revolution application. The integration allows store managers to view products from specific suppliers directly from their dashboard.

## Implementation Details

### Components Involved

1. **ManagerDashboard.jsx** - The main dashboard component for store managers
2. **SuppliersTab** - Sub-component within ManagerDashboard that handles supplier listing and product viewing
3. **API Services** - Services that handle data fetching from the backend

### Flow of Operation

1. Manager views the list of suppliers in the Suppliers tab
2. Manager clicks "View Products" button on a supplier card
3. System fetches products specific to that supplier
4. Products are displayed in a grid view with filtering options
5. Manager can add products to an order, export product list, or return to suppliers list

### Key Functions

#### `handleViewProducts(supplier)`
- **Purpose**: Fetches and displays products for a specific supplier
- **Parameters**: `supplier` - The supplier object containing ID and other details
- **Actions**:
  - Sets loading state
  - Stores selected supplier
  - Changes view to 'products'
  - Fetches supplier products via API
  - Handles errors and loading states

#### `handleBackToSuppliers()`
- **Purpose**: Returns to the suppliers list view
- **Actions**: Sets view state back to 'suppliers'

#### `getFilteredProducts()`
- **Purpose**: Filters products based on search criteria and filters
- **Returns**: Filtered array of products

### Data Flow

```
User clicks "View Products" button
↓
handleViewProducts() is called
↓
API request to managerAPI.getSupplierProducts(supplierId)
↓
Response data stored in state (supplierProducts)
↓
UI renders filtered products using getFilteredProducts()
```

### Features

1. **Product Filtering**
   - Search by name, description, or brand
   - Filter by category
   - Filter by price range
   - Filter by stock status

2. **Product Display**
   - Product image
   - Name and description
   - Price and stock information
   - Category and brand
   - Stock status indicator

3. **Actions**
   - Add products to order
   - Export product list to CSV
   - Return to suppliers list

## Usage Instructions

### For Managers

1. Navigate to the "Suppliers" tab in the Manager Dashboard
2. Find the supplier whose products you want to view
3. Click the "View Products" button on the supplier card
4. Browse products with optional filtering
5. Add products to order as needed
6. Click "Back to Suppliers" to return to the suppliers list

### For Developers

To modify the product catalogue view:

1. Edit the products view section in `ManagerDashboard.jsx`
2. Modify the `getFilteredProducts()` function to change filtering logic
3. Update API calls in `managerAPI.getSupplierProducts()` if backend changes

## API Endpoints

- **GET** `/suppliers/:supplierId/products` - Fetches products for a specific supplier
- **POST** `/suppliers/orders` - Places an order for products

## Styling

The product catalogue uses Tailwind CSS for styling with responsive design:
- Grid layout that adjusts columns based on screen size
- Card-based product display
- Color-coded stock indicators
- Responsive filters that stack on mobile

## Future Enhancements

1. Product comparison feature
2. Save favorite products
3. View product history and trends
4. Enhanced filtering options
5. Product recommendations based on order history 