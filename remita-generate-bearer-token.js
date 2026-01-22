// remita-generate-bearer-token.js
// Generate Bearer Token for Remita Biller API
// Based on official Remita authentication documentation

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
    // Demo Environment
    demo: {
        authUrl: "https://remitademo.net/remita/exapp/api/v1/send/api/uaa/oauth/token",
        username: "", // Demo credentials from Remita GitHub
        password: ""
    },
    
    // Live Environment (replace with your actual credentials)
    live: {
        authUrl: "https://login.remita.net/remita/exapp/api/v1/send/api/uaa/oauth/token",
        username: "",
        password: ""
    },
    
    // Choose environment
    environment: "demo" // Change to "live" for production
};

// =============================================================================
// BEARER TOKEN GENERATION
// =============================================================================

async function generateBearerToken(environment = "demo") {
    const config = CONFIG[environment];
    
    console.log("\n" + "=".repeat(70));
    console.log(`  GENERATING BEARER TOKEN (${environment.toUpperCase()} ENVIRONMENT)`);
    console.log("=".repeat(70));
    
    console.log("\n📋 Configuration:");
    console.log(`  Auth URL: ${config.authUrl}`);
    console.log(`  Username: ${config.username}`);
    console.log(`  Password: ${"*".repeat(config.password.length)}`);
    
    const payload = {
        username: config.username,
        password: config.password
    };

    console.log("\n🔄 Requesting token...");

    try {
        const response = await fetch(config.authUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const status = response.status;
        const data = await response.json();
        
        console.log(`\n📥 Response Status: ${status}`);
        
        if (status === 200 && data.access_token) {
            console.log("\n✅ SUCCESS! Bearer Token Generated");
            console.log("\n" + "=".repeat(70));
            console.log("TOKEN DETAILS");
            console.log("=".repeat(70));
            console.log(`\nAccess Token (Bearer Token):`);
            console.log(`${data.access_token}`);
            console.log(`\nToken Type: ${data.token_type}`);
            console.log(`Expires In: ${data.expires_in} seconds (${Math.floor(data.expires_in / 60)} minutes)`);
            
            if (data.refresh_token) {
                console.log(`\nRefresh Token:`);
                console.log(`${data.refresh_token}`);
            }
            
            console.log("\n" + "=".repeat(70));
            console.log("USAGE INSTRUCTIONS");
            console.log("=".repeat(70));
            console.log("\nAdd this to your API request headers:");
            console.log(`  Authorization: Bearer ${data.access_token.substring(0, 50)}...`);
            
            console.log("\n⚠️  IMPORTANT:");
            console.log("  - This token expires in 1 hour (3600 seconds)");
            console.log("  - Store it securely (environment variables, secrets manager)");
            console.log("  - Never commit tokens to version control");
            console.log("  - Regenerate when expired");
            
            return {
                success: true,
                accessToken: data.access_token,
                tokenType: data.token_type,
                expiresIn: data.expires_in,
                refreshToken: data.refresh_token
            };
            
        } else {
            console.log("\n❌ FAILED TO GENERATE TOKEN");
            console.log("\nResponse:", data);
            
            if (status === 401) {
                console.log("\n⚠️  Authentication Failed:");
                console.log("  - Check your username and password");
                console.log("  - Ensure you're using the correct environment credentials");
            } else if (status === 404) {
                console.log("\n⚠️  Endpoint Not Found:");
                console.log("  - Verify the authentication URL is correct");
                console.log("  - Check if you're using the right API version");
            }
            
            return {
                success: false,
                error: data
            };
        }
        
    } catch (error) {
        console.log("\n❌ NETWORK ERROR");
        console.log("Error:", error.message);
        
        return {
            success: false,
            error: error.message
        };
    }
}

// =============================================================================
// TOKEN REFRESH (Optional - if refresh token is available)
// =============================================================================

async function refreshBearerToken(refreshToken, environment = "demo") {
    const config = CONFIG[environment];
    
    console.log("\n" + "=".repeat(70));
    console.log("  REFRESHING BEARER TOKEN");
    console.log("=".repeat(70));
    
    const payload = {
        grant_type: "refresh_token",
        refresh_token: refreshToken
    };
    
    console.log("\n🔄 Refreshing token...");
    
    try {
        const response = await fetch(config.authUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (response.status === 200 && data.access_token) {
            console.log("\n✅ TOKEN REFRESHED SUCCESSFULLY");
            console.log(`\nNew Access Token: ${data.access_token.substring(0, 50)}...`);
            console.log(`Expires In: ${data.expires_in} seconds`);
            
            return {
                success: true,
                accessToken: data.access_token,
                expiresIn: data.expires_in
            };
        } else {
            console.log("\n❌ FAILED TO REFRESH TOKEN");
            console.log("Response:", data);
            
            return {
                success: false,
                error: data
            };
        }
        
    } catch (error) {
        console.log("\n❌ ERROR:", error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// =============================================================================
// TEST TOKEN VALIDITY
// =============================================================================

async function testTokenValidity(accessToken, environment = "demo") {
    console.log("\n" + "=".repeat(70));
    console.log("  TESTING TOKEN VALIDITY");
    console.log("=".repeat(70));
    
    const baseUrl = environment === "demo" 
        ? "https://remitademo.net/remita/exapp/api/v1/send/api/bgatesvc/v3/billpayment"
        : "https://login.remita.net/remita/exapp/api/v1/send/api/bgatesvc/v3/billpayment";
    
    console.log("\n🔄 Testing token with Get Billers endpoint...");
    
    try {
        const response = await fetch(`${baseUrl}/billers`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        const data = await response.json();
        
        if (response.status === 200 && data.status === 'success') {
            console.log("\n✅ TOKEN IS VALID!");
            console.log(`   Found ${data.data?.length || 0} billers`);
            return true;
        } else {
            console.log("\n❌ TOKEN VALIDATION FAILED");
            console.log("Response:", data);
            return false;
        }
        
    } catch (error) {
        console.log("\n❌ ERROR:", error.message);
        return false;
    }
}

// =============================================================================
// COMPLETE WORKFLOW
// =============================================================================

async function completeWorkflow() {
    console.log("\n");
    console.log("╔═══════════════════════════════════════════════════════════════════╗");
    console.log("║         REMITA BEARER TOKEN GENERATOR - COMPLETE WORKFLOW         ║");
    console.log("╚═══════════════════════════════════════════════════════════════════╝");
    
    const environment = CONFIG.environment;
    
    // Step 1: Generate token
    const tokenResult = await generateBearerToken(environment);
    
    if (!tokenResult.success) {
        console.log("\n⚠️  Workflow stopped due to token generation failure.\n");
        return;
    }
    
    // Wait a bit before testing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 2: Test token validity
    await testTokenValidity(tokenResult.accessToken, environment);
    
    // Step 3: Show how to use in code
    console.log("\n" + "=".repeat(70));
    console.log("SAMPLE CODE - HOW TO USE THE TOKEN");
    console.log("=".repeat(70));
    
    console.log(`
// In your Next.js API route or Node.js script:

const BEARER_TOKEN = "${tokenResult.accessToken.substring(0, 30)}...";

async function callRemitaAPI() {
    const response = await fetch(
        "https://remitademo.net/remita/exapp/api/v1/send/api/bgatesvc/v3/billpayment/billers",
        {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': \`Bearer \${BEARER_TOKEN}\`
            }
        }
    );
    
    const data = await response.json();
    return data;
}
    `);
    
    console.log("\n" + "=".repeat(70));
    console.log("NEXT STEPS");
    console.log("=".repeat(70));
    console.log(`
1. Save your Bearer Token securely:
   - Add to .env file: REMITA_BEARER_TOKEN="${tokenResult.accessToken.substring(0, 30)}..."
   - Never commit to Git
   
2. Use the token in your API requests (valid for 1 hour)

3. Implement token refresh logic:
   - Check token expiry
   - Regenerate or refresh when needed
   - Store refresh token if available

4. Test with the Biller API endpoints:
   - Get billers
   - Get products
   - Initiate payments
    `);
    
    console.log("\n✅ Workflow Complete!\n");
}

// =============================================================================
// EXPORT FOR MODULES
// =============================================================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateBearerToken,
        refreshBearerToken,
        testTokenValidity,
        completeWorkflow
    };
}

// =============================================================================
// RUN IF EXECUTED DIRECTLY
// =============================================================================

if (require.main === module) {
    completeWorkflow();
}