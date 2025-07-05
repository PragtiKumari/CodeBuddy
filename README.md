# CodeBuddy – Your real-time codeing Buddy for LeetCode, GFG, and more!

CodeBuddy is a cross-platform Chrome Extension designed to guide students, beginners, and developers during live problem-solving sessions on popular coding platforms like **LeetCode**, **GeeksforGeeks**, **Codeforces**, **CodeChef**, **HackerRank**, and **InterviewBit**.

> Think of it like that coder friend who never gives away the answer... but always knows how to nudge you in the right direction.

---

# Features

- **AI-Powered Hints** – Get dynamic, personalized hints using Google's Gemini API.
- **Smart Caching** – Hints are saved to the database to improve performance and reuse.
- **Fallback Safe** – Even when offline or rate-limited, CodeBuddy provides intelligent, topic-based fallback advice.
- **Platform Compatibility** – Works across 6 major coding platforms.
- **No Login Needed** – Just install, code, and get hints right in the editor!
- **Dark/Light Mode Friendly** – UI adjusts gracefully with coding platform theme.

---

# Supported Platforms

| Platform       | Status   |
|----------------|----------|
|   LeetCode     | Fully functional |
|  GeeksforGeeks | Available (Fallback enabled) |
|   Codeforces   | Available (Fallback enabled) |
|   CodeChef     | Available (Fallback enabled) |
|   HackerRank   | Available (Fallback enabled) |
|   InterviewBit | Available (Fallback enabled) |

---

# Tech Stack
**Frontend**: HTML, CSS, JavaScript
**Extension API**: Chrome Extension v3
**Backend**: Node.js, Express, MongoDB, Gemini API
**AI**: Gemini 1.5 Flash for dynamic hint generation

---

# Extension Structure
CodeBuddy/
├── .gitignore
├── backend/
│   ├── .env                          
│   ├── index.js                  
│   ├── simple-test.js              
│   ├── test-gemini.js               
│   ├── package.json
│   ├── package-lock.json
│   ├── models/
│   │   └── Hint.js                 
│   ├── routes/
│   │   └── hintRoute.js         
│   └── node_modules/
├── extension/
│   ├── manifest.json                 
│   ├── icon.png                     
│   ├── popup.css                    
│   ├── popup.html                    
│   ├── popup.js                      
│   ├── content/                     
│   │   ├── codechef.js
│   │   ├── codeforces.js
│   │   ├── gfg.js
│   │   ├── hackerrank.js
│   │   ├── interviewbit.js
│   │   └── leetcode.js              
│   ├── utils/                       
│   │   ├── constants.js
│   │   ├── detectPlatform.js
│   │   ├── storage.js
│   │   └── timer.js
│   └── landing-page/                
├── node_modules/

---

# How It Works
1. Extracts the current problem title from the platform.
2. Sends the title to backend API: `/api/hint`.
3. Backend:
   - requests a smart hint from Gemini API.
   - If Gemini fails, falls back to curated MongoDB cache.
4. Displays the hint to the user inside the website.

---

# Screenshots 
![image](https://github.com/user-attachments/assets/6dec4e4f-ebe3-4649-9fba-40acdafef3d2)
👆 Available on Chrome extensions.

![image](https://github.com/user-attachments/assets/52d4fc41-14bd-4bf2-b46d-696d6f890d7c)
👆 A pop-up '💡show hint' on the top-right side of screen ready to give you hints, making your coding journey easier.

![image](https://github.com/user-attachments/assets/e4f02c91-57b9-4333-955b-f8368794d8d6)
👆 The hint.

---

# Backend Setup
> bash

> cd backend

> npm install

> npm run dev

---

# Chrome Extension
Open Chrome and go to chrome://extensions/

Enable "Developer Mode"

Click "Load Unpacked" and select the CodeBuddy/ root directory.

Done! Open any supported platform and start coding with hints.

---

# Future Plans (Stage 2)

Coming soon:

1. **Line-by-line Hinting:**  
   Drag and drop "Show Hint" button next to any line of your code for *that specific logic*.
2. **Smart Follow-up Conversations:**  
   If the first hint isn’t enough, you’ll be able to **ask questions** to dive deeper. Think of it like “Chat with your hint”! 

---

# 🧑‍💻 Author
Pragati Kumari
B.Tech in ECE | Passionate about building tools that solve real world problems

🔗 LinkedIn: linkedin.com/in/pragati-kumari-p16

📫 Email: btech15110.22@bitmesra.ac.in



