const mongoose = require('mongoose');

/**
 * Generate a unique order number for manager orders
 * Format: MO-YYYYMMDD-XXXX where XXXX is a sequential number
 */
const generateUniqueOrderNumber = async () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  
  try {
    // Use atomic findOneAndUpdate to get next sequence number
    const Counter = require('../models/Counter');
    
    // Get the next sequence number for today's date
    const counter = await Counter.findOneAndUpdate(
      { _id: `MO-${dateStr}` },
      { $inc: { sequence: 1 } },
      { upsert: true, new: true }
    );
    
    const sequenceNumber = counter.sequence.toString().padStart(4, '0');
    return `MO-${dateStr}-${sequenceNumber}`;
    
  } catch (error) {
    // Fallback to timestamp-based approach if counter fails
    console.error('Counter approach failed, using timestamp fallback:', error);
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `MO-${dateStr}-${timestamp}-${randomSuffix}`;
  }
};

/**
 * Generate a unique order number for purchase orders
 * Format: PO-YYYYMMDD-XXXX where XXXX is a sequential number
 */
const generateUniquePurchaseOrderNumber = async () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  
  try {
    // Use atomic findOneAndUpdate to get next sequence number
    const Counter = require('../models/Counter');
    
    // Get the next sequence number for today's date
    const counter = await Counter.findOneAndUpdate(
      { _id: `PO-${dateStr}` },
      { $inc: { sequence: 1 } },
      { upsert: true, new: true }
    );
    
    const sequenceNumber = counter.sequence.toString().padStart(4, '0');
    return `PO-${dateStr}-${sequenceNumber}`;
    
  } catch (error) {
    // Fallback to timestamp-based approach if counter fails
    console.error('Counter approach failed, using timestamp fallback:', error);
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PO-${dateStr}-${timestamp}-${randomSuffix}`;
  }
};

module.exports = {
  generateUniqueOrderNumber,
  generateUniquePurchaseOrderNumber
}; 