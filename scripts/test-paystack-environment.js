const { PrismaClient } = require("@prisma/client");
const {
  getPaystackConfig,
  createPaystackInstance,
  logPaystackEnvironment,
} = require("../utils/paystackConfig");

const prisma = new PrismaClient();

async function testPaystackEnvironment() {
  try {
    console.log("Testing Paystack environment-based configuration...\n");

    // Test 1: Test environment configuration
    console.log("=== Test Environment ===");
    try {
      const testConfig = await getPaystackConfig(false);
      console.log("✅ Test environment config loaded successfully");
      console.log(`Secret Key: ${testConfig.secretKey.substring(0, 10)}...`);
      console.log(`Public Key: ${testConfig.publicKey.substring(0, 10)}...`);
      console.log(`Is Live: ${testConfig.isLive}\n`);
    } catch (error) {
      console.log("❌ Test environment config failed:", error.message);
    }

    // Test 2: Live environment configuration
    console.log("=== Live Environment ===");
    try {
      const liveConfig = await getPaystackConfig(true);
      console.log("✅ Live environment config loaded successfully");
      console.log(`Secret Key: ${liveConfig.secretKey.substring(0, 10)}...`);
      console.log(`Public Key: ${liveConfig.publicKey.substring(0, 10)}...`);
      console.log(`Is Live: ${liveConfig.isLive}\n`);
    } catch (error) {
      console.log("❌ Live environment config failed:", error.message);
    }

    // Test 3: Paystack instance creation
    console.log("=== Paystack Instance Creation ===");
    try {
      const testInstance = await createPaystackInstance(false);
      console.log("✅ Test Paystack instance created successfully");

      const liveInstance = await createPaystackInstance(true);
      console.log("✅ Live Paystack instance created successfully\n");
    } catch (error) {
      console.log("❌ Paystack instance creation failed:", error.message);
    }

    // Test 4: Environment logging
    console.log("=== Environment Logging ===");
    await logPaystackEnvironment(false);
    console.log("");
    await logPaystackEnvironment(true);
    console.log("");

    // Test 5: Database isLive field
    console.log("=== Database isLive Field Test ===");
    try {
      // Create a test property with isLive field
      const testProperty = await prisma.property.create({
        data: {
          title: "Test Property for Environment",
          address: "123 Test Street",
          lga: "Test LGA",
          totalCost: 1000,
          documentsUrls: [],
          site_images: [],
          userId: "test-user-id", // You'll need to replace this with a real user ID
          isLive: process.env.NODE_ENV === "production",
        },
      });

      console.log("✅ Test property created with isLive field");
      console.log(`Property ID: ${testProperty.id}`);
      console.log(`Reference: ${testProperty.reference}`);
      console.log(`Is Live: ${testProperty.isLive}`);
      console.log(`NODE_ENV: ${process.env.NODE_ENV}\n`);

      // Clean up test data
      await prisma.property.delete({
        where: { id: testProperty.id },
      });
      console.log("✅ Test property cleaned up");
    } catch (error) {
      console.log("❌ Database test failed:", error.message);
    }

    console.log("\n=== Environment Variables Check ===");
    const requiredVars = [
      "PAYSTACK_TEST_SECRET",
      "PAYSTACK_TEST_PUBLIC_KEY",
      "PAYSTACK_LIVE_SECRET",
      "PAYSTACK_LIVE_PUBLIC_KEY",
      "NODE_ENV",
      "BASE_URL",
      "ONLINE_BASE_URL",
    ];

    requiredVars.forEach((varName) => {
      const value = process.env[varName];
      if (value) {
        console.log(`✅ ${varName}: ${value.substring(0, 10)}...`);
      } else {
        console.log(`❌ ${varName}: Not set`);
      }
    });

    console.log("\n✅ Paystack environment test completed successfully!");
  } catch (error) {
    console.error("❌ Error testing Paystack environment:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testPaystackEnvironment();
