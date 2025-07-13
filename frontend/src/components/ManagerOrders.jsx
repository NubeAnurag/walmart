import React, { useState, useEffect } from 'react';
import { managerAPI } from '../services/api';

const ManagerOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    supplierId: '',
    dateFrom: '',
    dateTo: ''
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryData, setDeliveryData] = useState({
    orderId: '',
    deliveryDate: '',
    deliveryNotes: '',
    deliveredItems: []
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
      if (!filters.supplierId) delete params.supplierId;
      if (!filters.dateFrom) delete params.dateFrom;
      if (!filters.dateTo) delete params.dateTo;

      const response = await managerAPI.getOrders(params);
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
      case 'delivered':
        return 'bg-blue-100 text-blue-800';
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
      const response = await managerAPI.getOrderDetails(orderId);
      setSelectedOrder(response.data);
      setShowOrderDetails(true);
    } catch (err) {
      console.error('Error fetching order details:', err);
      alert('Failed to fetch order details');
    }
  };

    const openDeliveryModal = (order) => {
    const today = new Date().toISOString().split('T')[0];
    const deliveredItems = order.items.map(item => {
      // Handle different productId formats safely
      let productId;
      if (typeof item.productId === 'string') {
        productId = item.productId;
      } else if (item.productId && typeof item.productId === 'object') {
        productId = item.productId.id || item.productId._id || item.productId.toString();
      } else {
        console.warn('Invalid productId for item:', item);
        productId = item.productId || 'unknown';
      }
      
      return {
        productId: productId,
        productName: item.productName,
        orderedQuantity: item.quantity,
        deliveredQuantity: item.quantity, // Default to full quantity
        deliveryNotes: ''
      };
    });
    
    setDeliveryData({
      orderId: order.id,
      deliveryDate: today,
      deliveryNotes: '',
      deliveredItems: deliveredItems
    });
    setShowDeliveryModal(true);
  };

  const handleDeliveryItemChange = (index, field, value) => {
    const updatedItems = [...deliveryData.deliveredItems];
    updatedItems[index][field] = value;
    setDeliveryData({
      ...deliveryData,
      deliveredItems: updatedItems
    });
  };

  const handleAcceptDelivery = async () => {
    try {
      // Validate that at least one item has been delivered
      const hasDeliveredItems = deliveryData.deliveredItems.some(item => item.deliveredQuantity > 0);
      if (!hasDeliveredItems) {
        alert('Please specify delivered quantities for at least one item');
        return;
      }

      const requestData = {
        deliveredItems: deliveryData.deliveredItems.map(item => ({
          productId: item.productId,
          deliveredQuantity: parseInt(item.deliveredQuantity),
          deliveryNotes: item.deliveryNotes
        })),
        deliveryDate: deliveryData.deliveryDate,
        deliveryNotes: deliveryData.deliveryNotes
      };

      await managerAPI.acceptDelivery(deliveryData.orderId, requestData);
      
      // Refresh orders
      await fetchOrders();
      
      // Close modal and reset
      setShowDeliveryModal(false);
      setDeliveryData({
        orderId: '',
        deliveryDate: '',
        deliveryNotes: '',
        deliveredItems: []
      });
      
      alert('Delivery accepted successfully!');
    } catch (err) {
      console.error('Error accepting delivery:', err);
      alert('Failed to accept delivery: ' + (err.response?.data?.message || err.message));
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
        <h2 className="text-2xl font-bold text-gray-900">My Orders</h2>
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
            <option value="delivered">Delivered</option>
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
            onClick={() => setFilters({ status: '', supplierId: '', dateFrom: '', dateTo: '' })}
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
                  Supplier
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
                  Expected Delivery
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
                    {order.supplierName}
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.expectedDeliveryDate ? (
                      <span className="text-green-600 font-medium">
                        {formatDate(order.expectedDeliveryDate)}
                      </span>
                    ) : (
                      <span className="text-gray-400">
                        {order.status === 'pending' ? 'Pending approval' : 'Not set'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => viewOrderDetails(order.id)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View Details
                    </button>
                    {order.status === 'approved' && (
                      <button
                        onClick={() => openDeliveryModal(order)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Accept Delivery
                      </button>
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
                  {selectedOrder.deliveryAcceptedDate && (
                    <p><span className="font-medium">Delivery Accepted:</span> {formatDate(selectedOrder.deliveryAcceptedDate)}</p>
                  )}
                  {selectedOrder.deliveryStatus && selectedOrder.status === 'delivered' && (
                    <p><span className="font-medium">Delivery Status:</span> 
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedOrder.deliveryStatus === 'complete' ? 'bg-green-100 text-green-800' :
                        selectedOrder.deliveryStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {selectedOrder.deliveryStatus.charAt(0).toUpperCase() + selectedOrder.deliveryStatus.slice(1)}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Supplier Information */}
              <div>
                <h4 className="font-semibold mb-2">Supplier Information</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Name:</span> {selectedOrder.supplierName}</p>
                  <p><span className="font-medium">Email:</span> {selectedOrder.supplierId?.email}</p>
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
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ordered</th>
                      {selectedOrder.status === 'delivered' && (
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Delivered</th>
                      )}
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedOrder.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.productName}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{item.quantity}</td>
                        {selectedOrder.status === 'delivered' && (
                          <td className="px-4 py-2 text-sm">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              item.deliveredQuantity === item.quantity ? 'bg-green-100 text-green-800' :
                              item.deliveredQuantity > 0 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {item.deliveredQuantity || 0}
                            </span>
                            {item.deliveryNotes && (
                              <div className="text-xs text-gray-500 mt-1">{item.deliveryNotes}</div>
                            )}
                          </td>
                        )}
                        <td className="px-4 py-2 text-sm text-gray-500">${item.unitPrice.toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">${item.totalPrice.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes */}
            {(selectedOrder.notes?.manager || selectedOrder.notes?.supplier || selectedOrder.deliveryNotes) && (
              <div className="mt-6">
                <h4 className="font-semibold mb-2">Notes</h4>
                <div className="space-y-3">
                  {selectedOrder.notes?.manager && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-blue-800">Manager Notes:</p>
                      <p className="text-sm text-blue-700">{selectedOrder.notes.manager}</p>
                    </div>
                  )}
                  {selectedOrder.notes?.supplier && (
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-green-800">Supplier Notes:</p>
                      <p className="text-sm text-green-700">{selectedOrder.notes.supplier}</p>
                    </div>
                  )}
                  {selectedOrder.deliveryNotes && (
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-purple-800">Delivery Notes:</p>
                      <p className="text-sm text-purple-700">{selectedOrder.deliveryNotes}</p>
                    </div>
                  )}
                </div>
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
          </div>
        </div>
      )}

      {/* Delivery Acceptance Modal */}
      {showDeliveryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Accept Delivery</h3>
              <button
                onClick={() => setShowDeliveryModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Delivery Date */}
              <div>
                <label className="block text-sm font-medium mb-2">Delivery Date</label>
                <input
                  type="date"
                  value={deliveryData.deliveryDate}
                  onChange={(e) => setDeliveryData({ ...deliveryData, deliveryDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Product Checklist */}
              <div>
                <h4 className="font-semibold mb-3">Product Delivery Checklist</h4>
                <div className="space-y-4">
                  {deliveryData.deliveredItems.map((item, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-medium text-gray-900">{item.productName}</h5>
                        <span className="text-sm text-gray-500">Ordered: {item.orderedQuantity}</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Delivered Quantity</label>
                          <input
                            type="number"
                            min="0"
                            max={item.orderedQuantity}
                            value={item.deliveredQuantity}
                            onChange={(e) => handleDeliveryItemChange(index, 'deliveredQuantity', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
                          <input
                            type="text"
                            value={item.deliveryNotes}
                            onChange={(e) => handleDeliveryItemChange(index, 'deliveryNotes', e.target.value)}
                            placeholder="e.g., Damaged items, quality issues..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      
                      {/* Delivery Status Indicator */}
                      <div className="mt-2">
                        {item.deliveredQuantity == item.orderedQuantity ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Complete
                          </span>
                        ) : item.deliveredQuantity > 0 ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            ⚠ Partial ({item.deliveredQuantity}/{item.orderedQuantity})
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            ✗ Not Delivered
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Notes */}
              <div>
                <label className="block text-sm font-medium mb-2">Overall Delivery Notes (Optional)</label>
                <textarea
                  value={deliveryData.deliveryNotes}
                  onChange={(e) => setDeliveryData({ ...deliveryData, deliveryNotes: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add any general notes about the delivery..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={handleAcceptDelivery}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-medium"
                >
                  Accept Delivery
                </button>
                <button
                  onClick={() => setShowDeliveryModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 font-medium"
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

export default ManagerOrders; 