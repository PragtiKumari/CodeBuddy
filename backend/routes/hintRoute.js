const express = require("express");
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const Hint = require("../models/Hint");
require("dotenv").config();

// Fallback hints for common problem patterns
const FALLBACK_HINTS = {
  "two sum": "Consider using a hash map to store complements as you iterate through the array.",
  "reverse": "Think about using two pointers - one at the start and one at the end.",
  "palindrome": "Compare characters from both ends moving inward, or reverse and compare.",
  "binary search": "Remember the condition: if target < mid, search left; if target > mid, search right.",
  "linked list": "Consider using two pointers (slow and fast) or dummy nodes for edge cases.",
  "tree": "Think about recursion - process current node, then left and right subtrees.",
  "dynamic programming": "Break down into subproblems. What's the base case? What's the recurrence relation?",
  "sliding window": "Use two pointers to maintain a window and adjust the window size based on conditions.",
  "graph": "Consider BFS for shortest path or level-order, DFS for connectivity or pathfinding.",
  "array": "Consider sorting first, or using hash maps for O(1) lookups.",
  "string": "Think about character frequency, sliding window, or two pointers technique.",
  "stack": "LIFO structure - useful for matching parentheses, expression evaluation, or DFS.",
  "queue": "FIFO structure - useful for BFS, level-order traversal, or scheduling problems.",
  "heap": "Useful for finding kth largest/smallest elements or maintaining sorted order dynamically.",
  "sort": "Consider the time complexity needed - O(n log n) for comparison sorts, O(n) for counting sort.",
  "backtrack": "Use recursion with state management. Make a choice, explore, then undo the choice.",
  "greedy": "Make locally optimal choices. Ensure the greedy choice leads to optimal solution.",
  "trie": "Useful for prefix matching, autocomplete, or word search problems.",
  "union find": "Great for connectivity problems, cycle detection, or grouping elements."
};

// Generic hints for when no specific pattern matches
const GENERIC_HINTS = [
  "Break down the problem into smaller subproblems. What's the simplest case?",
  "Consider the time and space complexity. Can you optimize by trading space for time?",
  "Think about edge cases: empty input, single element, or maximum constraints.",
  "What data structure would give you the most efficient access pattern?",
  "Can you solve this with a greedy approach, or do you need dynamic programming?",
  "Consider sorting the input first - it might reveal a pattern or simplify the solution.",
  "Think about invariants - what remains true throughout your algorithm?",
  "Can you use a hash map to reduce time complexity from O(n²) to O(n)?",
  "Consider using recursion with memoization for overlapping subproblems.",
  "Think about the problem constraints - they often hint at the expected solution complexity.",
  "Try working through a small example by hand to understand the pattern.",
  "Consider if this problem has been solved before in a different context.",
  "What would happen if you processed the data in a different order?",
  "Can you eliminate impossible cases early to reduce the search space?",
  "Think about the relationship between input size and expected time complexity."
];

function getRandomGenericHint() {
  return GENERIC_HINTS[Math.floor(Math.random() * GENERIC_HINTS.length)];
}

function findBestFallbackHint(questionTitle) {
  const title = questionTitle.toLowerCase();
  
  // Check for specific patterns in the title
  for (const [pattern, hint] of Object.entries(FALLBACK_HINTS)) {
    if (title.includes(pattern)) {
      return hint;
    }
  }
  
  // Additional pattern matching for common keywords
  const keywords = {
    "maximum": "Consider using a heap, sliding window, or dynamic programming approach.",
    "minimum": "Think about greedy algorithms, binary search, or optimization techniques.",
    "substring": "Try sliding window technique or two pointers approach.",
    "subarray": "Consider prefix sums, sliding window, or divide and conquer.",
    "path": "This might be a graph problem - consider BFS, DFS, or dynamic programming.",
    "cycle": "Think about Floyd's cycle detection algorithm or graph traversal.",
    "duplicate": "Consider using a set, hash map, or sorting to detect duplicates.",
    "anagram": "Try sorting characters or using character frequency counting.",
    "parentheses": "Stack data structure is often useful for matching problems.",
    "interval": "Consider sorting intervals and using a greedy or merge approach."
  };
  
  for (const [keyword, hint] of Object.entries(keywords)) {
    if (title.includes(keyword)) {
      return hint;
    }
  }
  
  // Return a random generic hint if no pattern matches
  return getRandomGenericHint();
}

async function getHintFromDatabase(questionTitle) {
  try {
    const existingHint = await Hint.findOne({ 
      title: { $regex: new RegExp(questionTitle, 'i') } 
    });
    return existingHint ? existingHint.hint : null;
  } catch (error) {
    console.error("❌ Database query error:", error);
    return null;
  }
}

async function saveHintToDatabase(questionTitle, hint) {
  try {
    const newHint = new Hint({
      title: questionTitle,
      hint: hint
    });
    await newHint.save();
    console.log("💾 Hint saved to database for:", questionTitle);
  } catch (error) {
    console.error("❌ Error saving hint to database:", error);
  }
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

Example good hints:
- "Consider using a hash map to store values you've seen before"
- "Think about the two-pointer technique for this array problem"
- "This looks like a dynamic programming problem - what are the subproblems?"
- "Binary search might help optimize this solution"

Problem: "${questionTitle}"
Hint:`;

  try {
    console.log("🤖 Calling Gemini API for:", questionTitle);
    
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
            stopSequences: []
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        }),
      }
    );

    console.log("📡 Gemini API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Gemini API error response:", errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("📦 Gemini API response data:", JSON.stringify(data, null, 2));

    if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      const hint = data.candidates[0].content.parts[0].text.trim();
      console.log("✅ Got hint from Gemini:", hint.substring(0, 100) + "...");
      return hint;
    } else {
      console.log("⚠️ No valid hint in Gemini response structure");
      throw new Error("Invalid Gemini response format");
    }
  } catch (error) {
    console.error("❌ Gemini API error:", error.message);
    throw error;
  }
}

router.post("/hint", async (req, res) => {
  const { questionTitle } = req.body;
  
  if (!questionTitle) {
    return res.status(400).json({ error: "Question title is required" });
  }

  console.log("🔍 Hint requested for:", questionTitle);

  try {
    // Step 1: Check if hint exists in database
    const dbHint = await getHintFromDatabase(questionTitle);
    if (dbHint) {
      console.log("📚 Found hint in database");
      return res.json({ hint: dbHint, source: "database" });
    }

    // Step 2: Try to get hint from Gemini API
    try {
      const geminiHint = await getHintFromGemini(questionTitle);
      
      // Save to database for future use
      await saveHintToDatabase(questionTitle, geminiHint);
      
      return res.json({ hint: geminiHint, source: "gemini" });
    } catch (geminiError) {
      console.error("❌ Gemini API failed:", geminiError.message);
      
      // Step 3: Use intelligent fallback
      const fallbackHint = findBestFallbackHint(questionTitle);
      console.log("🎯 Using intelligent fallback hint");
      
      return res.json({ 
        hint: fallbackHint, 
        source: "fallback",
        message: "AI service temporarily unavailable, using pattern-based hint"
      });
    }

  } catch (error) {
    console.error("❌ Unexpected error:", error);
    
    // Final fallback
    const emergencyHint = getRandomGenericHint();
    return res.json({ 
      hint: emergencyHint, 
      source: "emergency",
      message: "Service temporarily unavailable, using generic hint"
    });
  }
});

// Test endpoint for Gemini API
router.get("/test-gemini", async (req, res) => {
  try {
    const testHint = await getHintFromGemini("Two Sum");
    res.json({ 
      success: true, 
      hint: testHint,
      message: "Gemini API is working correctly!"
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: "Gemini API test failed"
    });
  }
});

module.exports = router;