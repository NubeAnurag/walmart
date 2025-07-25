import React, { useState, useEffect } from 'react';
import { supplierAPI } from '../services/api';

const SupplierOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    storeId: '',
    dateFrom: '',
    dateTo: ''
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionData, setActionData] = useState({
    orderId: '',
    status: '',
    notes: '',
    estimatedDeliveryDate: ''
  });

  useEffect(() => {
    fetchOrders();
  }, [filters]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = { ...filters };
      if (!filters.status) delete params.status;
      if (!filters.storeId) delete params.storeId;
      if (!filters.dateFrom) delete params.dateFrom;
      if (!filters.dateTo) delete params.dateTo;

      const response = await supplierAPI.getManagerOrders(params);
      setOrders(response.data || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const viewOrderDetails = async (orderId) => {
    try {
      const response = await supplierAPI.getManagerOrderDetails(orderId);
      setSelectedOrder(response.data);
      setShowOrderDetails(true);
    } catch (err) {
      console.error('Error fetching order details:', err);
      alert('Failed to fetch order details');
    }
  };

  const openActionModal = (orderId, action) => {
    // Get minimum date (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];
    
    setActionData({
      orderId: orderId,
      status: action,
      notes: '',
      estimatedDeliveryDate: action === 'approved' ? minDate : ''
    });
    setShowActionModal(true);
  };

  const handleAction = async () => {
    try {
      // Validate delivery date for approved orders
      if (actionData.status === 'approved' && !actionData.estimatedDeliveryDate) {
        alert('Please select an estimated delivery date for approved orders');
        return;
      }
      
      const requestData = {
        status: actionData.status,
        notes: actionData.notes
      };
      
      if (actionData.status === 'approved') {
        requestData.estimatedDeliveryDate = actionData.estimatedDeliveryDate;
      }
      
      await supplierAPI.updateManagerOrderStatus(actionData.orderId, requestData);
      
      // Refresh orders
      await fetchOrders();
      
      // Close modal and reset
      setShowActionModal(false);
      setActionData({ orderId: '', status: '', notes: '', estimatedDeliveryDate: '' });
      
      alert(`Order ${actionData.status} successfully!`);
    } catch (err) {
      console.error('Error updating order status:', err);
      alert('Failed to update order status: ' + (err.response?.data?.message || err.message));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
        <button 
          onClick={fetchOrders}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Manager Orders</h2>
        <button
          onClick={fetchOrders}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <input
            type="date"
            placeholder="From Date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <input
            type="date"
            placeholder="To Date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            onClick={() => setFilters({ status: '', storeId: '', dateFrom: '', dateTo: '' })}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Manager
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Store
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {order.orderNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.managerName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.storeName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${order.totalAmount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(order.orderDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => viewOrderDetails(order.id)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View
                    </button>
                    {order.status === 'pending' && (
                      <>
                        <button
                          onClick={() => openActionModal(order.id, 'approved')}
                          className="text-green-600 hover:text-green-900"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => openActionModal(order.id, 'rejected')}
                          className="text-red-600 hover:text-red-900"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {orders.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No orders found</p>
        </div>
      )}

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Order Details</h3>
              <button
                onClick={() => setShowOrderDetails(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Order Information */}
              <div>
                <h4 className="font-semibold mb-2">Order Information</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Order Number:</span> {selectedOrder.orderNumber}</p>
                  <p><span className="font-medium">Status:</span> 
                    <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedOrder.status)}`}>
                      {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                    </span>
                  </p>
                  <p><span className="font-medium">Order Date:</span> {formatDate(selectedOrder.orderDate)}</p>
                  <p><span className="font-medium">Total Amount:</span> ${selectedOrder.totalAmount.toFixed(2)}</p>
                  {selectedOrder.expectedDeliveryDate && (
                    <p><span className="font-medium">Expected Delivery:</span> {formatDate(selectedOrder.expectedDeliveryDate)}</p>
                  )}
                </div>
              </div>

              {/* Manager Information */}
              <div>
                <h4 className="font-semibold mb-2">Manager Information</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Name:</span> {selectedOrder.managerName}</p>
                  <p><span className="font-medium">Email:</span> {selectedOrder.managerId?.email}</p>
                  <p><span className="font-medium">Store:</span> {selectedOrder.storeName}</p>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="mt-6">
              <h4 className="font-semibold mb-2">Order Items</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedOrder.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.productName}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{item.quantity}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">${item.unitPrice.toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">${item.totalPrice.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes */}
            {selectedOrder.notes?.manager && (
              <div className="mt-6">
                <h4 className="font-semibold mb-2">Manager Notes</h4>
                <p className="text-sm text-gray-600">{selectedOrder.notes.manager}</p>
              </div>
            )}

            {/* Timeline */}
            {selectedOrder.timeline && selectedOrder.timeline.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold mb-2">Order Timeline</h4>
                <div className="space-y-2">
                  {selectedOrder.timeline.map((event, index) => (
                    <div key={index} className="flex items-center space-x-3 text-sm">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="font-medium">{event.status}</span>
                      <span className="text-gray-500">{formatDate(event.timestamp)}</span>
                      {event.notes && <span className="text-gray-600">- {event.notes}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons for Pending Orders */}
            {selectedOrder.status === 'pending' && (
              <div className="mt-6 flex space-x-4">
                <button
                  onClick={() => {
                    setShowOrderDetails(false);
                    openActionModal(selectedOrder.id, 'approved');
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Approve Order
                </button>
                <button
                  onClick={() => {
                    setShowOrderDetails(false);
                    openActionModal(selectedOrder.id, 'rejected');
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Reject Order
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Modal */}
      {showActionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {actionData.status === 'approved' ? 'Approve' : 'Reject'} Order
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
                <textarea
                  value={actionData.notes}
                  onChange={(e) => setActionData({ ...actionData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows="3"
                  placeholder={`Add notes for ${actionData.status} action...`}
                />
              </div>
              
              {actionData.status === 'approved' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Estimated Delivery Date</label>
                  <input
                    type="date"
                    value={actionData.estimatedDeliveryDate}
                    onChange={(e) => setActionData({ ...actionData, estimatedDeliveryDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    min={actionData.estimatedDeliveryDate ? actionData.estimatedDeliveryDate : new Date().toISOString().split('T')[0]}
                  />
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  onClick={handleAction}
                  className={`flex-1 py-2 rounded-lg text-white ${
                    actionData.status === 'approved' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {actionData.status === 'approved' ? 'Approve' : 'Reject'}
                </button>
                <button
                  onClick={() => setShowActionModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierOrders; 