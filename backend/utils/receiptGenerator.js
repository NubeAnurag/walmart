const puppeteer = require('puppeteer');
const path = require('path');

// Generate HTML template for receipt
const generateReceiptHTML = (saleData) => {
  const {
    transactionId,
    saleDate,
    totalAmount,
    items,
    customerInfo,
    storeInfo,
    staffInfo,
    subtotal,
    totalProfit
  } = saleData;

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Receipt - ${transactionId}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.4;
          color: #333;
          background: white;
          margin: 0;
          padding: 20px;
        }
        
        .receipt {
          max-width: 300px;
          margin: 0 auto;
          background: white;
          border: 1px solid #ddd;
          padding: 20px;
        }
        
        .header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
        }
        
        .store-name {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .store-info {
          font-size: 10px;
          color: #666;
          margin-bottom: 3px;
        }
        
        .transaction-info {
          margin-bottom: 15px;
          font-size: 11px;
        }
        
        .transaction-info div {
          margin-bottom: 3px;
        }
        
        .items-section {
          margin-bottom: 15px;
        }
        
        .items-header {
          border-bottom: 1px solid #333;
          padding-bottom: 5px;
          margin-bottom: 10px;
          font-weight: bold;
          display: flex;
          justify-content: space-between;
        }
        
        .item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 11px;
        }
        
        .item-name {
          flex: 1;
          margin-right: 10px;
        }
        
        .item-qty {
          width: 30px;
          text-align: center;
        }
        
        .item-price {
          width: 50px;
          text-align: right;
        }
        
        .item-total {
          width: 60px;
          text-align: right;
          font-weight: bold;
        }
        
        .item-details {
          font-size: 10px;
          color: #666;
          margin-left: 10px;
          margin-top: 2px;
        }
        
        .totals {
          border-top: 1px solid #333;
          padding-top: 10px;
          margin-top: 15px;
        }
        
        .total-line {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
          font-size: 11px;
        }
        
        .total-line.final {
          font-weight: bold;
          font-size: 14px;
          border-top: 1px solid #333;
          padding-top: 5px;
          margin-top: 10px;
        }
        
        .footer {
          text-align: center;
          margin-top: 20px;
          font-size: 10px;
          color: #666;
          border-top: 1px dashed #333;
          padding-top: 10px;
        }
        
        .customer-info {
          margin-bottom: 15px;
          font-size: 11px;
        }
        
        .customer-info div {
          margin-bottom: 3px;
        }
        
        .staff-info {
          margin-bottom: 15px;
          font-size: 11px;
        }
        
        .thank-you {
          font-weight: bold;
          margin-top: 10px;
        }
        
        .barcode {
          text-align: center;
          font-family: 'Courier New', monospace;
          font-size: 8px;
          margin-top: 10px;
          letter-spacing: 1px;
        }
      </style>
    </head>
    <body>
      <div class="receipt receipt-container">
        <!-- Header -->
        <div class="header">
          <div class="store-name">WALMART SUPERCENTER</div>
          <div class="store-info">${storeInfo.name}</div>
          <div class="store-info">${storeInfo.address}</div>
          <div class="store-info">${storeInfo.phone}</div>
        </div>
        
        <!-- Transaction Info -->
        <div class="transaction-info">
          <div><strong>Transaction ID:</strong> ${transactionId}</div>
          <div><strong>Date:</strong> ${formatDate(saleDate)}</div>
          <div><strong>Store Code:</strong> ${storeInfo.storeCode}</div>
        </div>
        
        <!-- Customer Info -->
        <div class="customer-info">
          <div><strong>Customer:</strong> ${customerInfo.name}</div>
          ${customerInfo.email ? `<div><strong>Email:</strong> ${customerInfo.email}</div>` : ''}
          ${customerInfo.phone ? `<div><strong>Phone:</strong> ${customerInfo.phone}</div>` : ''}
        </div>
        
        <!-- Staff Info -->
        <div class="staff-info">
          <div><strong>Cashier:</strong> ${staffInfo.name}</div>
          <div><strong>Employee ID:</strong> ${staffInfo.employeeId}</div>
        </div>
        
        <!-- Items -->
        <div class="items-section">
          <div class="items-header">
            <span>Item</span>
            <span>Qty</span>
            <span>Price</span>
            <span>Total</span>
          </div>
          
          ${items.map(item => `
            <div class="item">
              <div class="item-name">${item.name}</div>
              <div class="item-qty">${item.quantity}</div>
              <div class="item-price">${formatCurrency(item.unitPrice)}</div>
              <div class="item-total">${formatCurrency(item.totalPrice)}</div>
            </div>
            ${item.barcode ? `<div class="item-details">SKU: ${item.barcode}</div>` : ''}
            ${item.category ? `<div class="item-details">Category: ${item.category}</div>` : ''}
          `).join('')}
        </div>
        
        <!-- Totals -->
        <div class="totals">
          <div class="total-line">
            <span>Subtotal:</span>
            <span>${formatCurrency(subtotal)}</span>
          </div>
          <div class="total-line">
            <span>Tax:</span>
            <span>$0.00</span>
          </div>
          <div class="total-line final">
            <span>TOTAL:</span>
            <span>${formatCurrency(totalAmount)}</span>
          </div>
          <div class="total-line">
            <span>Payment Method:</span>
            <span>Cash</span>
          </div>
          <div class="total-line">
            <span>Items Sold:</span>
            <span>${items.reduce((sum, item) => sum + item.quantity, 0)}</span>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <div class="thank-you">Thank you for shopping with us!</div>
          <div>Save money. Live better.</div>
          <div>Return Policy: 30 days with receipt</div>
          <div class="barcode">||||| ${transactionId} |||||</div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Generate PDF receipt
const generateReceiptPDF = async (saleData) => {
  let browser;
  try {
    console.log('🚀 Starting PDF generation process...');
    
    // Launch browser with optimized settings for speed
    console.log('🔄 Launching browser...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080'
      ]
    });

    console.log('✅ Browser launched successfully');
    const page = await browser.newPage();
    
    // Set viewport for consistent rendering
    await page.setViewport({ width: 800, height: 600 });
    
    // Generate HTML content
    console.log('🔄 Generating HTML content...');
    const htmlContent = generateReceiptHTML(saleData);
    console.log('✅ HTML content generated, length:', htmlContent.length);
    
    // Set HTML content
    console.log('🔄 Setting page content...');
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    console.log('✅ Page content set successfully');
    
    // Generate PDF with receipt-optimized settings
    console.log('🔄 Generating PDF...');
    const pdfBuffer = await page.pdf({
      format: 'A5',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      },
      preferCSSPageSize: true
    });

    console.log('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes');
    await browser.close();
    
    return pdfBuffer;
    
  } catch (error) {
    console.error('❌ PDF generation error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    if (browser) {
      try {
        await browser.close();
        console.log('🔄 Browser closed after error');
      } catch (closeError) {
        console.error('❌ Error closing browser:', closeError);
      }
    }
    throw new Error(`PDF generation failed: ${error.message}`);
  }
};

// Generate receipt as image (JPG/PNG)
const generateReceiptImage = async (saleData, format = 'jpeg') => {
  let browser;
  try {
    console.log(`🚀 Starting ${format.toUpperCase()} generation process...`);
    
    // Launch browser with optimized settings for speed
    console.log('🔄 Launching browser...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080'
      ]
    });

    console.log('✅ Browser launched successfully');
    const page = await browser.newPage();
    
    // Set viewport for consistent rendering - optimized for receipt
    await page.setViewport({ width: 600, height: 800 });
    
    // Generate HTML content
    console.log('🔄 Generating HTML content...');
    const htmlContent = generateReceiptHTML(saleData);
    console.log('✅ HTML content generated, length:', htmlContent.length);
    
    // Set HTML content
    console.log('🔄 Setting page content...');
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    console.log('✅ Page content set successfully');
    
    // Wait for any fonts or styles to load
    await page.waitForTimeout(1000);
    
    // Get the receipt element dimensions
    const receiptElement = await page.$('.receipt-container');
    if (!receiptElement) {
      throw new Error('Receipt container not found');
    }
    
    // Generate image screenshot
    console.log(`🔄 Generating ${format.toUpperCase()} image...`);
    const imageBuffer = await receiptElement.screenshot({
      type: format,
      quality: format === 'jpeg' ? 90 : undefined,
      omitBackground: false
    });

    console.log(`✅ ${format.toUpperCase()} generated successfully, size:`, imageBuffer.length, 'bytes');
    await browser.close();
    
    return imageBuffer;
    
  } catch (error) {
    console.error(`❌ ${format.toUpperCase()} generation error:`, error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    if (browser) {
      try {
        await browser.close();
        console.log('🔄 Browser closed after error');
      } catch (closeError) {
        console.error('❌ Error closing browser:', closeError);
      }
    }
    throw new Error(`${format.toUpperCase()} generation failed: ${error.message}`);
  }
};

// Generate receipt filename
const generateReceiptFilename = (transactionId, format = 'pdf') => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const extension = format === 'jpeg' ? 'jpg' : format;
  return `receipt-${transactionId}-${timestamp}.${extension}`;
};

module.exports = {
  generateReceiptPDF,
  generateReceiptImage,
  generateReceiptHTML,
  generateReceiptFilename
}; 