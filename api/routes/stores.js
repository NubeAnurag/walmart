const express = require('express');
const router = express.Router();
const Store = require('../models/Store');

// GET /api/stores - Get all active stores
router.get('/', async (req, res) => {
  try {
    const stores = await Store.findActive();
    
    res.json({
      success: true,
      message: 'Stores retrieved successfully',
      data: stores
    });
  } catch (error) {
    console.error('Get stores error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving stores'
    });
  }
});

// GET /api/stores/:id - Get specific store
router.get('/:id', async (req, res) => {
  try {
    const store = await Store.findById(req.params.id);
    
    if (!store || !store.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Store retrieved successfully',
      data: store
    });
  } catch (error) {
    console.error('Get store error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving store'
    });
  }
});

module.exports = router; 