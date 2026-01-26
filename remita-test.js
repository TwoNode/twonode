// Remita API Integration Test Script
// This script tests the bill generation workflow

const REMITA_BASE_URL = 'https://api-demo.systemspecsng.com/services/connect-gateway/api/v1';
const SECRET_KEY = 'remi_test_sk_YVZ6OXpRcHdmaitoOUU3TGZya1Fob2IxZSt1bUxMdnV3ZlZtb1E9PTdlM2M0ZjYyYzc2MzQ0YzA2YTFlODFhYWE2MmI5MzU2NzQ4NWY0OTY3ZDM1YmEzOWMzOTczZDk1YzU5NjE3NWM=';

// Helper function to make API calls
async function remitaRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'secretKey': SECRET_KEY,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${REMITA_BASE_URL}${endpoint}`, options);
    const data = await response.json();
    
    if (data.status !== '00') {
      throw new Error(`API Error: ${data.message}`);
    }
    
    return data;
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
}

// 1. Get all available billers
async function getBillers(page = 0, size = 20) {
  console.log('📋 Fetching billers...');
  const data = await remitaRequest(`/biller/get-billers?page=${page}&size=${size}`);
  console.log(`✅ Found ${data.data.length} billers`);
  return data.data;
}

// 2. Get all categories
async function getCategories(page = 0, size = 20) {
  console.log('📂 Fetching categories...');
  const data = await remitaRequest(`/biller/get-categories?page=${page}&size=${size}`);
  console.log(`✅ Found ${data.data.length} categories`);
  return data.data;
}

// 3. Get billers by category
async function getBillersByCategory(categoryId) {
  console.log(`🔍 Fetching billers for category ${categoryId}...`);
  const data = await remitaRequest(`/biller/get-biller-by-category/${categoryId}`);
  console.log(`✅ Found ${data.data.length} billers in this category`);
  return data.data;
}

// 4. Get products for a specific biller
async function getBillerProducts(billerId) {
  console.log(`🛒 Fetching products for biller ${billerId}...`);
  const data = await remitaRequest(`/biller/${billerId}/products`);
  console.log(`✅ Found ${data.data.products.length} products`);
  return data.data;
}

// 5. Validate customer (if required by product)
async function validateCustomer(billPaymentProductId, customerId) {
  console.log(`🔐 Validating customer ${customerId}...`);
  const body = {
    billPaymentProductId,
    customerId
  };
  const data = await remitaRequest('/biller/validate-customer', 'POST', body);
  console.log('✅ Customer validated:', data.data.name);
  return data.data;
}

// Main test workflow
async function testRemitaIntegration() {
  console.log('🚀 Starting Remita API Integration Test\n');

  try {
    // Step 1: Get categories to find government payments
    const categories = await getCategories();
    const govCategory = categories.find(cat => 
      cat.categoryName.toLowerCase().includes('government')
    );
    
    if (govCategory) {
      console.log(`\n📍 Government Category: ${govCategory.categoryName} (ID: ${govCategory.categoryId})\n`);
      
      // Step 2: Get billers in government category
      const govBillers = await getBillersByCategory(govCategory.categoryId);
      
      if (govBillers.length > 0) {
        const sampleBiller = govBillers[0];
        console.log(`\n🏛️ Sample Government Biller: ${sampleBiller.billerName}\n`);
        
        // Step 3: Get products for this biller
        const billerData = await getBillerProducts(sampleBiller.billerId);
        
        if (billerData.products.length > 0) {
          const sampleProduct = billerData.products[0];
          console.log(`\n💳 Sample Product: ${sampleProduct.billPaymentProductName}`);
          console.log(`   - Product ID: ${sampleProduct.billPaymentProductId}`);
          console.log(`   - Fixed Amount: ${sampleProduct.isAmountFixed}`);
          console.log(`   - Amount: ${sampleProduct.amount} ${sampleProduct.currency}`);
          console.log(`   - Custom Fields: ${sampleProduct.metadata.customFields.length}\n`);
          
          // Step 4: If product requires validation, test it
          const needsValidation = sampleProduct.metadata.customFields.some(
            field => field.validation === true
          );
          
          if (needsValidation) {
            console.log('⚠️ This product requires customer validation');
            console.log('💡 Use the validateCustomer() function before generating RRR\n');
          }
        }
      }
    }

    // Step 5: List all billers for reference
    console.log('\n📊 All Available Billers:');
    const allBillers = await getBillers(0, 2000);
    allBillers.forEach((biller, index) => {
      console.log(`${index + 1}. ${biller.billerName} (${biller.billerId})`);
    });

    console.log('\n✨ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Write data to JSON files
async function writeToFile(filename, data) {
  const fs = require('fs').promises;
  const path = require('path');
  
  const filepath = path.join(process.cwd(), filename);
  await fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✅ Data written to ${filename}`);
}

// Save all billers and categories to files
async function saveAllData() {
  console.log('🚀 Fetching and saving all Remita data...\n');

  try {
    // Get and save all categories
    console.log('📂 Fetching all categories...');
    const categories = await getCategories(0, 100);
    await writeToFile('remita-categories.json', categories);
    console.log(`   Found ${categories.length} categories\n`);

    // Get and save all billers
    console.log('📋 Fetching all billers (this may take a moment)...');
    const billers = await getBillers(0, 5000);
    await writeToFile('remita-billers.json', billers);
    console.log(`   Found ${billers.length} billers\n`);

    // Get billers by category
    console.log('🗂️ Organizing billers by category...\n');
    const billersByCategory = {};
    
    for (const category of categories) {
      console.log(`   Processing: ${category.categoryName}...`);
      try {
        const categoryBillers = await getBillersByCategory(category.categoryId);
        billersByCategory[category.categoryName] = {
          categoryId: category.categoryId,
          categoryDescription: category.categoryDescription,
          billerCount: categoryBillers.length,
          billers: categoryBillers
        };
        console.log(`   ✅ Found ${categoryBillers.length} billers`);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`   ❌ Error fetching billers for ${category.categoryName}`);
      }
    }

    await writeToFile('remita-billers-by-category.json', billersByCategory);

    // Create a summary file
    const summary = {
      totalCategories: categories.length,
      totalBillers: billers.length,
      categorySummary: categories.map(cat => ({
        name: cat.categoryName,
        id: cat.categoryId,
        billerCount: billersByCategory[cat.categoryName]?.billerCount || 0
      })),
      governmentBillers: billersByCategory['Government Payments'] || {},
      timestamp: new Date().toISOString()
    };

    await writeToFile('remita-summary.json', summary);

    console.log('\n📊 Summary:');
    console.log(`   Total Categories: ${summary.totalCategories}`);
    console.log(`   Total Billers: ${summary.totalBillers}`);
    console.log(`   Government Billers: ${summary.governmentBillers.billerCount || 0}`);
    
    console.log('\n✨ All data saved successfully!');
    console.log('\n📁 Files created:');
    console.log('   - remita-categories.json');
    console.log('   - remita-billers.json');
    console.log('   - remita-billers-by-category.json');
    console.log('   - remita-summary.json\n');

  } catch (error) {
    console.error('\n❌ Error saving data:', error.message);
  }
}

// Test with a working biller
async function testWorkingBiller() {
  console.log('🧪 Testing with known working billers...\n');
  
  // These are from the documentation
  const testBillers = [
    { name: 'UNIVERSITY OF IBADAN', id: 'S0000573002' },
    { name: 'JAMB', id: 'JAMB' },
    { name: 'QA CORPORATION', id: 'QADEMO' }
  ];

  for (const biller of testBillers) {
    try {
      console.log(`\n🏛️ Testing: ${biller.name} (${biller.id})`);
      const products = await getBillerProducts(biller.id);
      
      console.log(`✅ Success! Found ${products.products.length} products:`);
      products.products.forEach((product, idx) => {
        console.log(`   ${idx + 1}. ${product.billPaymentProductName}`);
        console.log(`      - ID: ${product.billPaymentProductId}`);
        console.log(`      - Amount: ${product.isAmountFixed ? product.amount : 'Variable'} ${product.currency}`);
        console.log(`      - Custom Fields: ${product.metadata.customFields.length}`);
      });
      
      // Save this biller's products
      await writeToFile(`remita-products-${biller.id}.json`, products);
      
    } catch (error) {
      console.error(`❌ Failed: ${error.message}`);
    }
  }
}

// Run based on command line argument
const args = process.argv.slice(2);
const command = args[0] || 'save';

if (command === 'save') {
  saveAllData();
} else if (command === 'test') {
  testWorkingBiller();
} else if (command === 'full') {
  testRemitaIntegration();
} else {
  console.log('Usage:');
  console.log('  node remita-test.js save  - Save all billers and categories to JSON files');
  console.log('  node remita-test.js test  - Test with working billers');
  console.log('  node remita-test.js full  - Run full integration test');
}

// Export functions for use in Next.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getBillers,
    getCategories,
    getBillersByCategory,
    getBillerProducts,
    validateCustomer,
    saveAllData,
    testWorkingBiller,
    REMITA_BASE_URL,
    SECRET_KEY
  };
}