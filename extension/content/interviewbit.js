(function () {
  // Configuration
  const CONFIG = {
    BACKEND_URL: "http://localhost:3000/api/hint",
    BUTTON_ID: "codebuddy-hint-button-ib",
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
    // InterviewBit problem URLs patterns:
    // https://www.interviewbit.com/problems/problem-name/
    // https://www.interviewbit.com/problems/problem-name/?tab=solution
    const pathname = window.location.pathname;
    return pathname.startsWith("/problems/") && 
           pathname !== "/problems/" &&
           !pathname.includes("/list/") &&
           !pathname.includes("/category/");
  };

  const extractProblemTitle = () => {
    // Multiple selectors to try in order of preference for InterviewBit
    const selectors = [
      // Main problem title selectors
      '.problem-statement h1',
      '.problem-title',
      '.problem-heading',
      'h1.problem-name',
      '.content-area h1',
      '.question-title',
      'h1[class*="title"]',
      'h1[class*="problem"]',
      '.problem-content h1',
      '.main-content h1',
      // Broader selectors
      'h1',
      'h2',
      '.title',
      '[class*="title"]',
      // Fallback selectors
      '.problem-statement-content h1',
      '.problem-description h1'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        let title = element.textContent.trim();
        
        // Clean up the title - remove numbers, dots, and extra whitespace
        title = title.replace(/^\d+\.\s*/, '').trim();
        
        // Remove difficulty indicators and common prefixes
        title = title.replace(/\s*\(Easy\)|\s*\(Medium\)|\s*\(Hard\)/gi, '').trim();
        title = title.replace(/^Problem\s*:\s*/i, '').trim();
        title = title.replace(/^Question\s*:\s*/i, '').trim();
        
        // If title is too long, it might include description
        if (title.length > 100) {
          title = title.split('\n')[0].trim();
        }
        
        // Skip if title is too generic or empty
        if (title.length < 3 || 
            title.toLowerCase().includes('loading') ||
            title.toLowerCase().includes('interview') ||
            title.toLowerCase() === 'problem' ||
            title.toLowerCase() === 'question') {
          continue;
        }
        
        return title;
      }
    }

    // Fallback: extract from URL
    const urlParts = window.location.pathname.split('/');
    if (urlParts.length >= 3 && urlParts[2]) {
      let titleFromUrl = urlParts[2];
      
      // Convert kebab-case to Title Case
      titleFromUrl = titleFromUrl.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      
      // Remove common suffixes
      titleFromUrl = titleFromUrl.replace(/\s*(Solution|Answer|Code)$/i, '').trim();
      
      return titleFromUrl;
    }

    return null;
  };

  const createHintButton = () => {
    const button = document.createElement("button");
    button.id = CONFIG.BUTTON_ID;
    button.innerHTML = "💡 Show Hint";
    
    // Enhanced styling optimized for InterviewBit
    Object.assign(button.style, {
      position: "fixed",
      top: "120px",
      right: "20px",
      padding: "12px 20px",
      backgroundColor: "#FF6B35",
      color: "white",
      border: "none",
      borderRadius: "12px",
      zIndex: "9999",
      cursor: "pointer",
      fontWeight: "bold",
      fontSize: "14px",
      fontFamily: "system-ui, -apple-system, sans-serif",
      boxShadow: "0 4px 12px rgba(255, 107, 53, 0.3)",
      transition: "all 0.3s ease",
      userSelect: "none",
      minWidth: "120px",
      textAlign: "center"
    });

    // Hover effects
    button.addEventListener("mouseenter", () => {
      button.style.backgroundColor = "#E55A2B";
      button.style.transform = "translateY(-2px)";
      button.style.boxShadow = "0 6px 16px rgba(255, 107, 53, 0.4)";
    });

    button.addEventListener("mouseleave", () => {
      button.style.backgroundColor = "#FF6B35";
      button.style.transform = "translateY(0)";
      button.style.boxShadow = "0 4px 12px rgba(255, 107, 53, 0.3)";
    });

    return button;
  };

  const showHintModal = (hint, source) => {
    // Remove existing modal if any
    const existingModal = document.getElementById("codebuddy-hint-modal-ib");
    if (existingModal) {
      existingModal.remove();
    }

    // Create modal container
    const modalContainer = document.createElement("div");
    modalContainer.id = "codebuddy-hint-modal-ib";
    
    // Create Shadow DOM to isolate from InterviewBit's CSS
    const shadow = modalContainer.attachShadow({ mode: 'closed' });
    
    // Create styles that cannot be overridden
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
        border: 2px solid #FF6B35;
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
        color: #FF6B35;
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
      
      .codebuddy-branding {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        font-size: 14px;
        color: #FF6B35;
        font-weight: 500;
      }
    `;
    
    // Create the modal HTML
    const modalHTML = `
      <div class="modal-overlay">
        <div class="modal-content">
          <button class="close-button" id="close-btn">×</button>
          <div class="codebuddy-branding">
            <span>🧠</span>
            <span>CodeBuddy for InterviewBit</span>
          </div>
          <h3 class="modal-title">💡 Programming Hint</h3>
          <div class="hint-text">${hint}</div>
          <div class="source-info">Source: ${source} • Auto-closes in 15s</div>
        </div>
      </div>
    `;
    
    // Add styles and HTML to shadow DOM
    shadow.appendChild(style);
    shadow.innerHTML += modalHTML;
    
    // Add event listeners
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
    
    // Escape key handler
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Auto-close after timeout
    setTimeout(() => {
      if (document.body.contains(modalContainer)) {
        closeModal();
      }
    }, CONFIG.HINT_DISPLAY_TIMEOUT);
    
    // Append to body
    document.body.appendChild(modalContainer);
  };

  const fetchHint = async (problemTitle) => {
    const button = document.getElementById(CONFIG.BUTTON_ID);
    if (!button) return;

    // Update button to show loading state
    const originalText = button.innerHTML;
    button.innerHTML = "🔄 Loading...";
    button.disabled = true;
    button.style.cursor = "not-allowed";

    try {
      console.log(`🔍 CodeBuddy: Fetching hint for "${problemTitle}"`);
      
      const response = await fetch(CONFIG.BACKEND_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          questionTitle: problemTitle,
          platform: "interviewbit"
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ CodeBuddy: Hint received from backend");

      if (data?.hint) {
        showHintModal(data.hint, data.source || "unknown");
      } else {
        showHintModal(
          "No specific hint available for this problem. Try breaking it down into smaller components and think about which data structure would be most efficient for this type of problem.",
          "fallback"
        );
      }
    } catch (error) {
      console.error("❌ CodeBuddy: Error fetching hint:", error);
      showHintModal(
        "Unable to fetch hint right now. Consider the problem's constraints and think about time/space complexity. What data structure would give you the most efficient solution?",
        "offline"
      );
    } finally {
      // Restore button
      button.innerHTML = originalText;
      button.disabled = false;
      button.style.cursor = "pointer";
    }
  };

  const injectHintButton = () => {
    // Prevent duplicate injection
    if (isButtonInjected || document.getElementById(CONFIG.BUTTON_ID)) {
      return;
    }

    const problemTitle = extractProblemTitle();
    if (!problemTitle) {
      pollingAttempts++;
      if (pollingAttempts < CONFIG.MAX_POLLING_ATTEMPTS) {
        console.log(`⚠️ CodeBuddy: Could not extract problem title, retrying... (${pollingAttempts}/${CONFIG.MAX_POLLING_ATTEMPTS})`);
        setTimeout(injectHintButton, CONFIG.POLLING_INTERVAL);
      } else {
        console.log("❌ CodeBuddy: Max polling attempts reached, giving up");
      }
      return;
    }

    console.log(`✅ CodeBuddy: Injecting hint button for InterviewBit problem: "${problemTitle}"`);
    
    const button = createHintButton();
    button.addEventListener("click", () => fetchHint(problemTitle));
    
    document.body.appendChild(button);
    isButtonInjected = true;
    currentProblemTitle = problemTitle;
    pollingAttempts = 0;
  };

  const removeHintButton = () => {
    const existingButton = document.getElementById(CONFIG.BUTTON_ID);
    if (existingButton) {
      existingButton.remove();
      isButtonInjected = false;
      currentProblemTitle = null;
      pollingAttempts = 0;
      console.log("🗑️ CodeBuddy: Hint button removed");
    }
  };

  const handlePageChange = debounce(() => {
    console.log("🔄 CodeBuddy: Page change detected, checking...");
    
    if (isProblemPage()) {
      const newTitle = extractProblemTitle();
      console.log(`📝 CodeBuddy: New problem title: "${newTitle}"`);
      
      // If we're on a different problem, re-inject the button
      if (newTitle && newTitle !== currentProblemTitle) {
        console.log("🔄 CodeBuddy: Different problem detected, updating button");
        removeHintButton();
        
        // Small delay to ensure DOM is updated
        setTimeout(() => {
          injectHintButton();
        }, 500);
      } else if (!newTitle && !isButtonInjected) {
        // Try to inject if we don't have a button yet
        setTimeout(injectHintButton, 1000);
      }
    } else {
      // Remove button if not on problem page
      console.log("📄 CodeBuddy: Not on problem page, removing button");
      removeHintButton();
    }
  }, 500);

  // Initial setup
  const initializeExtension = () => {
    console.log("🚀 CodeBuddy: Initializing InterviewBit extension...");
    console.log(`📍 CodeBuddy: Current URL: ${window.location.href}`);
    console.log(`📍 CodeBuddy: Is problem page: ${isProblemPage()}`);
    
    if (isProblemPage()) {
      console.log("✅ CodeBuddy: InterviewBit problem page detected on load!");
      
      // Try multiple times with increasing delays to handle dynamic content
      const attemptTimes = [100, 500, 1000, 2000, 3000];
      attemptTimes.forEach(delay => {
        setTimeout(() => {
          if (!isButtonInjected) {
            injectHintButton();
          }
        }, delay);
      });
    }
  };

  // Set up observers for dynamic content
  const setupObservers = () => {
    // Watch for URL changes (SPA navigation)
    let lastUrl = window.location.href;
    const checkForURLChange = () => {
      if (lastUrl !== window.location.href) {
        console.log(`🔄 CodeBuddy: URL changed from ${lastUrl} to ${window.location.href}`);
        lastUrl = window.location.href;
        handlePageChange();
      }
    };

    // Poll for URL changes every second
    setInterval(checkForURLChange, 1000);

    // Watch for DOM changes
    const observer = new MutationObserver(debounce((mutations) => {
      // Check if significant changes happened
      const hasSignificantChanges = mutations.some(mutation => 
        mutation.type === 'childList' && 
        mutation.addedNodes.length > 0 &&
        Array.from(mutation.addedNodes).some(node => 
          node.nodeType === Node.ELEMENT_NODE &&
          (node.querySelector('h1') || node.querySelector('[class*="title"]') || node.querySelector('[class*="problem"]'))
        )
      );

      if (hasSignificantChanges && isProblemPage() && !isButtonInjected) {
        console.log("🔄 CodeBuddy: Significant DOM changes detected, checking for button injection");
        injectHintButton();
      }
    }, 1000));

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      attributeOldValue: false,
      characterData: false,
      characterDataOldValue: false
    });

    // Listen for navigation events
    window.addEventListener('popstate', () => {
      console.log("🔄 CodeBuddy: popstate event detected");
      handlePageChange();
    });
    
    // Listen for pushstate/replacestate events (for SPA navigation)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      console.log("🔄 CodeBuddy: pushState event detected");
      setTimeout(handlePageChange, 100);
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      console.log("🔄 CodeBuddy: replaceState event detected");
      setTimeout(handlePageChange, 100);
    };

    // Listen for focus events (when user returns to tab)
    window.addEventListener('focus', () => {
      if (isProblemPage() && !isButtonInjected) {
        console.log("🔄 CodeBuddy: Window focus detected, checking for button injection");
        setTimeout(injectHintButton, 500);
      }
    });
  };

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log("📄 CodeBuddy: DOM content loaded");
      initializeExtension();
      setupObservers();
    });
  } else {
    console.log("📄 CodeBuddy: DOM already ready");
    initializeExtension();
    setupObservers();
  }

  // Additional initialization after a short delay
  setTimeout(() => {
    if (isProblemPage() && !isButtonInjected) {
      console.log("🔄 CodeBuddy: Final initialization attempt");
      injectHintButton();
    }
  }, 2000);

  console.log("🚀 CodeBuddy: InterviewBit extension initialized successfully!");
})();
