// gfg.js - GeeksforGeeks Content Script
(function () {
  // Configuration
  const CONFIG = {
    BACKEND_URL: "http://localhost:3000/api/hint",
    BUTTON_ID: "codebuddy-hint-button-gfg",
    POLLING_INTERVAL: 1000,
    MAX_POLLING_ATTEMPTS: 30,
    HINT_DISPLAY_TIMEOUT: 15000
  };

  // State management
  let isButtonInjected = false;
  let currentProblemTitle = null;
  let pollingAttempts = 0;

  // Utility functions
  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  const isProblemPage = () => {
    // GFG problem URLs: /problems/problem-name/, /practice/problem-name/
    return (window.location.pathname.includes("/problems/") || 
            window.location.pathname.includes("/practice/")) &&
           !window.location.pathname.endsWith("/problems/") &&
           !window.location.pathname.endsWith("/practice/");
  };

  const extractProblemTitle = () => {
    // GFG specific selectors
    const selectors = [
      'h1.problem-title',
      '.problem-title h1',
      'h1[class*="title"]',
      'h1[class*="problem"]',
      '.problem-statement h1',
      'h1',
      '.header-title h1',
      '.problem-header h1',
      '[class*="problemTitle"]',
      '.problem-name'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        let title = element.textContent.trim();
        
        // Clean up GFG specific formatting
        title = title.replace(/^\d+\.\s*/, '').trim();
        title = title.replace(/\s*\|\s*Practice\s*\|\s*GeeksforGeeks/gi, '').trim();
        title = title.replace(/\s*-\s*GeeksforGeeks/gi, '').trim();
        title = title.replace(/\s*\(Easy\)|\s*\(Medium\)|\s*\(Hard\)/gi, '').trim();
        
        // Remove common GFG prefixes
        title = title.replace(/^(Problem:\s*|Question:\s*)/gi, '').trim();
        
        // If title is too long, take first line
        if (title.length > 100) {
          title = title.split('\n')[0].trim();
        }
        
        return title;
      }
    }

    // Fallback: extract from URL
    const urlParts = window.location.pathname.split('/');
    const problemSlug = urlParts.find(part => part && part !== 'problems' && part !== 'practice');
    if (problemSlug) {
      return problemSlug.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }

    return null;
  };

  const createHintButton = () => {
    const button = document.createElement("button");
    button.id = CONFIG.BUTTON_ID;
    button.innerHTML = "💡 Show Hint";
    
    // GFG-specific styling (green theme)
    Object.assign(button.style, {
      position: "fixed",
      top: "120px",
      right: "20px",
      padding: "12px 20px",
      backgroundColor: "#2f8d46",
      color: "white",
      border: "none",
      borderRadius: "12px",
      zIndex: "9999",
      cursor: "pointer",
      fontWeight: "bold",
      fontSize: "14px",
      fontFamily: "system-ui, -apple-system, sans-serif",
      boxShadow: "0 4px 12px rgba(47, 141, 70, 0.3)",
      transition: "all 0.3s ease",
      userSelect: "none"
    });

    // Hover effects
    button.addEventListener("mouseenter", () => {
      button.style.backgroundColor = "#1e5f32";
      button.style.transform = "translateY(-2px)";
      button.style.boxShadow = "0 6px 16px rgba(47, 141, 70, 0.4)";
    });

    button.addEventListener("mouseleave", () => {
      button.style.backgroundColor = "#2f8d46";
      button.style.transform = "translateY(0)";
      button.style.boxShadow = "0 4px 12px rgba(47, 141, 70, 0.3)";
    });

    return button;
  };

  const showHintModal = (hint, source) => {
    // Remove existing modal if any
    const existingModal = document.getElementById("codebuddy-hint-modal-gfg");
    if (existingModal) {
      existingModal.remove();
    }

    const modalContainer = document.createElement("div");
    modalContainer.id = "codebuddy-hint-modal-gfg";
    
    const shadow = modalContainer.attachShadow({ mode: 'closed' });
    
    const style = document.createElement('style');
    style.textContent = `
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        backdrop-filter: blur(5px);
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .modal-content {
        background-color: #ffffff;
        border-radius: 16px;
        padding: 24px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
        position: relative;
        border: 1px solid #e0e0e0;
      }
      
      .close-button {
        position: absolute;
        top: 12px;
        right: 12px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s;
      }
      
      .close-button:hover {
        background-color: #f0f0f0;
      }
      
      .modal-title {
        margin: 0 0 16px 0;
        color: #2f8d46;
        font-size: 18px;
        font-weight: bold;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .hint-text {
        color: #333333;
        font-size: 16px;
        line-height: 1.6;
        margin-bottom: 16px;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        text-align: left;
        word-wrap: break-word;
        white-space: pre-wrap;
        user-select: text;
        -webkit-user-select: text;
        -moz-user-select: text;
        -ms-user-select: text;
      }
      
      .source-info {
        color: #666666;
        font-style: italic;
        font-size: 12px;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
    `;
    
    const modalHTML = `
      <div class="modal-overlay">
        <div class="modal-content">
          <button class="close-button" id="close-btn">×</button>
          <h3 class="modal-title">💡 Hint for GFG Problem</h3>
          <div class="hint-text">${hint}</div>
          <div class="source-info">Source: ${source}</div>
        </div>
      </div>
    `;
    
    shadow.appendChild(style);
    shadow.innerHTML += modalHTML;
    
    const closeBtn = shadow.querySelector('#close-btn');
    const overlay = shadow.querySelector('.modal-overlay');
    
    const closeModal = () => {
      modalContainer.remove();
      document.removeEventListener('keydown', handleEscape);
    };
    
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };
    document.addEventListener('keydown', handleEscape);
    
    setTimeout(() => {
      closeModal();
    }, CONFIG.HINT_DISPLAY_TIMEOUT);
    
    document.body.appendChild(modalContainer);
  };

  const fetchHint = async (problemTitle) => {
    const button = document.getElementById(CONFIG.BUTTON_ID);
    if (!button) return;

    const originalText = button.innerHTML;
    button.innerHTML = "🔄 Getting hint...";
    button.disabled = true;

    try {
      const response = await fetch(CONFIG.BACKEND_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ questionTitle: problemTitle }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data?.hint) {
        showHintModal(data.hint, data.source || "unknown");
      } else {
        showHintModal(
          "No specific hint available for this problem. Try breaking it down into smaller parts!",
          "fallback"
        );
      }
    } catch (error) {
      console.error("❌ Error fetching hint:", error);
      showHintModal(
        "Unable to fetch hint right now. Consider the problem's constraints and think about which data structure might be most efficient.",
        "offline"
      );
    } finally {
      button.innerHTML = originalText;
      button.disabled = false;
    }
  };

  const injectHintButton = () => {
    if (isButtonInjected || document.getElementById(CONFIG.BUTTON_ID)) {
      return;
    }

    const problemTitle = extractProblemTitle();
    if (!problemTitle) {
      console.log("⚠️ GFG: Could not extract problem title, retrying...");
      return;
    }

    console.log("✅ CodeBuddy GFG: Injecting hint button for:", problemTitle);
    
    const button = createHintButton();
    button.addEventListener("click", () => fetchHint(problemTitle));
    
    document.body.appendChild(button);
    isButtonInjected = true;
    currentProblemTitle = problemTitle;
  };

  const handlePageChange = debounce(() => {
    if (isProblemPage()) {
      const newTitle = extractProblemTitle();
      
      if (newTitle && newTitle !== currentProblemTitle) {
        const existingButton = document.getElementById(CONFIG.BUTTON_ID);
        if (existingButton) {
          existingButton.remove();
        }
        isButtonInjected = false;
        currentProblemTitle = null;
        
        setTimeout(injectHintButton, 500);
      }
    } else {
      const existingButton = document.getElementById(CONFIG.BUTTON_ID);
      if (existingButton) {
        existingButton.remove();
        isButtonInjected = false;
        currentProblemTitle = null;
      }
    }
  }, 300);

  const initializeExtension = () => {
    if (isProblemPage()) {
      console.log("✅ CodeBuddy GFG: Problem page detected on load!");
      setTimeout(injectHintButton, 100);
      setTimeout(injectHintButton, 500);
      setTimeout(injectHintButton, 1000);
    }
  };

  const setupObservers = () => {
    let lastUrl = window.location.href;
    const checkForURLChange = () => {
      if (lastUrl !== window.location.href) {
        lastUrl = window.location.href;
        handlePageChange();
      }
    };

    setInterval(checkForURLChange, 1000);

    const observer = new MutationObserver(debounce(() => {
      if (isProblemPage() && !isButtonInjected) {
        injectHintButton();
      }
    }, 1000));

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    window.addEventListener('popstate', handlePageChange);
    window.addEventListener('pushstate', handlePageChange);
    window.addEventListener('replacestate', handlePageChange);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializeExtension();
      setupObservers();
    });
  } else {
    initializeExtension();
    setupObservers();
  }

  console.log("🚀 CodeBuddy GFG: Extension initialized!");
})();