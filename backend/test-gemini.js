// test-gemini.js - Comprehensive Gemini API testing script
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
require("dotenv").config();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testGeminiAPI() {
  log("🧪 Testing Gemini API Integration...", 'cyan');
  
  // Check if API key is set
  if (!process.env.GEMINI_API_KEY) {
    log("❌ GEMINI_API_KEY not found in environment variables!", 'red');
    log("💡 Make sure your .env file has: GEMINI_API_KEY=your_api_key_here", 'yellow');
    return false;
  }
  
  log(`✅ API Key found: ${process.env.GEMINI_API_KEY.substring(0, 10)}...`, 'green');
  
  const testCases = [
    { title: "Two Sum", expected: "hash map" },
    { title: "Reverse Linked List", expected: "pointer" },
    { title: "Valid Parentheses", expected: "stack" },
    { title: "Binary Tree Level Order Traversal", expected: "BFS" },
    { title: "Longest Substring Without Repeating Characters", expected: "sliding window" }
  ];
  
  let passedTests = 0;
  
  for (const testCase of testCases) {
    log(`\n🔍 Testing: "${testCase.title}"`, 'blue');
    
    try {
      const hint = await getHintFromGemini(testCase.title);
      
      if (hint && hint.length > 10) {
        log(`✅ Success! Generated hint (${hint.length} chars)`, 'green');
        log(`💡 Hint: ${hint.substring(0, 100)}...`, 'yellow');
        passedTests++;
      } else {
        log(`❌ Failed: Empty or too short hint`, 'red');
      }
    } catch (error) {
      log(`❌ Failed: ${error.message}`, 'red');
    }
    
    // Add delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  log(`\n📊 Test Results: ${passedTests}/${testCases.length} tests passed`, 
      passedTests === testCases.length ? 'green' : 'yellow');
  
  return passedTests === testCases.length;
}

async function getHintFromGemini(questionTitle) {
  const prompt = `You are a coding mentor helping with a LeetCode problem. Give a helpful and concise coding hint for: "${questionTitle}"

Guidelines:
- Don't solve the problem directly or provide code
- Suggest the right approach, algorithm, or data structure
- Mention time/space complexity considerations if relevant
- Be encouraging and guide toward the solution
- Keep response under 150 words
- Focus on the key insight that will help solve the problem

Problem: "${questionTitle}"
Hint:`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 200,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text.trim();
    } else {
      throw new Error("Invalid response format from Gemini API");
    }
  } catch (error) {
    throw new Error(`Gemini API error: ${error.message}`);
  }
}

async function testAPIKeyValidity() {
  log("🔑 Testing API Key Validity...", 'cyan');
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: "Hello, this is a test message." }],
            },
          ],
        }),
      }
    );

    if (response.status === 401) {
      log("❌ API Key is invalid or expired!", 'red');
      log("💡 Please check your GEMINI_API_KEY in the .env file", 'yellow');
      return false;
    } else if (response.status === 403) {
      log("❌ API Key doesn't have permission to use Gemini API!", 'red');
      log("💡 Make sure your API key has Gemini API access enabled", 'yellow');
      return false;
    } else if (response.ok) {
      log("✅ API Key is valid and working!", 'green');
      return true;
    } else {
      log(`⚠️ Unexpected response status: ${response.status}`, 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ Error testing API key: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  log("🚀 CodeBuddy Gemini API Test Suite", 'magenta');
  log("=" * 50, 'magenta');
  
  // Test 1: Check API key validity
  const isKeyValid = await testAPIKeyValidity();
  if (!isKeyValid) {
    log("\n❌ API Key test failed. Please fix the API key before continuing.", 'red');
    process.exit(1);
  }
  
  // Test 2: Test actual hint generation
  const allTestsPassed = await testGeminiAPI();
  
  if (allTestsPassed) {
    log("\n🎉 All tests passed! Gemini API integration is working correctly.", 'green');
    log("✅ You can now use CodeBuddy with confidence!", 'green');
  } else {
    log("\n⚠️ Some tests failed. Check the error messages above.", 'yellow');
    log("💡 The fallback system will handle failed cases.", 'yellow');
  }
}

// Run the tests
main().catch(error => {
  log(`❌ Test suite failed: ${error.message}`, 'red');
  process.exit(1);
});