const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function testIsLiveField() {
  try {
    console.log("Testing isLive field functionality...\n");

    // Test creating a property with isLive field
    const testProperty = await prisma.property.create({
      data: {
        title: "Test Property",
        address: "123 Test Street",
        lga: "Test LGA",
        totalCost: 1000,
        documentsUrls: [],
        site_images: [],
        userId: "test-user-id", // You'll need to replace this with a real user ID
        isLive: process.env.NODE_ENV === "production",
      },
    });

    console.log("Created test property:", {
      id: testProperty.id,
      reference: testProperty.reference,
      isLive: testProperty.isLive,
      createdAt: testProperty.createdAt,
    });

    // Test creating a one-time property with isLive field
    const testOneTimeProperty = await prisma.oneTimeUserProperty.create({
      data: {
        email: "test@example.com",
        requester: "Test User",
        address: "456 Test Avenue",
        lga: "Test LGA",
        totalCost: 500,
        documentsUrls: [],
        site_images: [],
        isLive: process.env.NODE_ENV === "production",
      },
    });

    console.log("Created test one-time property:", {
      id: testOneTimeProperty.id,
      reference: testOneTimeProperty.reference,
      isLive: testOneTimeProperty.isLive,
      createdAt: testOneTimeProperty.createdAt,
    });

    console.log("\n✅ isLive field test completed successfully!");
    console.log(`Current NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`isLive value: ${process.env.NODE_ENV === "production"}`);
  } catch (error) {
    console.error("❌ Error testing isLive field:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testIsLiveField();
