(function () {
  // Configuration
  const CONFIG = {
    BACKEND_URL: "http://localhost:3000/api/hint",
    BUTTON_ID: "codebuddy-hint-button",
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
    return window.location.pathname.includes("/problems/") || 
           window.location.pathname.includes("/problem/") ||
           window.location.pathname.includes("/submit/");
  };

  const extractProblemTitle = () => {
    // CodeChef problem title selectors
    const selectors = [
      '.problem-statement h1',
      '.problem-statement .title',
      '.problem-statement header h1',
      '.problem-title',
      '.problem-statement h2',
      '.problem-header h1',
      '.problem-header .title',
      'h1.problem-title',
      '.problem-name',
      '.problem-statement .problem-name',
      // Additional fallback selectors
      '.content h1',
      '.main-content h1',
      'h1'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        let title = element.textContent.trim();
        
        // Clean up the title
        title = title.replace(/Problem\s*-\s*/i, '').trim();
        title = title.replace(/^\w+\s*-\s*/, '').trim(); // Remove problem codes
        title = title.replace(/\s*\([^)]+\)\s*$/g, '').trim(); // Remove parentheses at end
        
        if (title.length > 100) {
          title = title.split('\n')[0].trim();
        }
        
        return title;
      }
    }

    // Extract from URL as fallback
    const urlParts = window.location.pathname.split('/');
    const problemIndex = urlParts.findIndex(part => part === 'problems' || part === 'problem');
    if (problemIndex >= 0 && problemIndex < urlParts.length - 1) {
      return urlParts[problemIndex + 1].split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }

    return null;
  };

  const createHintButton = () => {
    const button = document.createElement("button");
    button.id = CONFIG.BUTTON_ID;
    button.innerHTML = "💡 Show Hint";
    
    // Enhanced styling for CodeChef
    Object.assign(button.style, {
      position: "fixed",
      top: "120px",
      right: "20px",
      padding: "12px 20px",
      backgroundColor: "#8B4513",
      color: "white",
      border: "none",
      borderRadius: "12px",
      zIndex: "9999",
      cursor: "pointer",
      fontWeight: "bold",
      fontSize: "14px",
      fontFamily: "system-ui, -apple-system, sans-serif",
      boxShadow: "0 4px 12px rgba(139, 69, 19, 0.3)",
      transition: "all 0.3s ease",
      userSelect: "none"
    });

    // Hover effects
    button.addEventListener("mouseenter", () => {
      button.style.backgroundColor = "#654321";
      button.style.transform = "translateY(-2px)";
      button.style.boxShadow = "0 6px 16px rgba(139, 69, 19, 0.4)";
    });

    button.addEventListener("mouseleave", () => {
      button.style.backgroundColor = "#8B4513";
      button.style.transform = "translateY(0)";
      button.style.boxShadow = "0 4px 12px rgba(139, 69, 19, 0.3)";
    });

    return button;
  };

  const showHintModal = (hint, source) => {
    // Remove existing modal if any
    const existingModal = document.getElementById("codebuddy-hint-modal");
    if (existingModal) {
      existingModal.remove();
    }

    // Create modal container
    const modalContainer = document.createElement("div");
    modalContainer.id = "codebuddy-hint-modal";
    
    // Create Shadow DOM to isolate from CodeChef's CSS
    const shadow = modalContainer.attachShadow({ mode: 'closed' });
    
    // Create styles
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
        border: 2px solid #8B4513;
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
        color: #8B4513;
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
      }
      
      .source-info {
        color: #666666;
        font-style: italic;
        font-size: 12px;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .platform-badge {
        display: inline-block;
        background-color: #8B4513;
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 10px;
        font-weight: bold;
        margin-bottom: 8px;
      }
    `;
    
    // Create the modal HTML
    const modalHTML = `
      <div class="modal-overlay">
        <div class="modal-content">
          <div class="platform-badge">CodeChef</div>
          <button class="close-button" id="close-btn">×</button>
          <h3 class="modal-title">💡 CodeBuddy Hint</h3>
          <div class="hint-text">${hint}</div>
          <div class="source-info">Source: ${source}</div>
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
      closeModal();
    }, CONFIG.HINT_DISPLAY_TIMEOUT);
    
    document.body.appendChild(modalContainer);
  };

  const fetchHint = async (problemTitle) => {
    const button = document.getElementById(CONFIG.BUTTON_ID);
    if (!button) return;

    // Update button to show loading state
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
        "Unable to fetch hint right now. Consider the problem's constraints and think about which algorithm might be most efficient.",
        "offline"
      );
    } finally {
      // Restore button
      button.innerHTML = originalText;
      button.disabled = false;
    }
  };

  const injectHintButton = () => {
    // Prevent duplicate injection
    if (isButtonInjected || document.getElementById(CONFIG.BUTTON_ID)) {
      return;
    }

    const problemTitle = extractProblemTitle();
    if (!problemTitle) {
      console.log("⚠️ CodeBuddy: Could not extract CodeChef problem title, retrying...");
      return;
    }

    console.log("✅ CodeBuddy: Injecting hint button for CodeChef problem:", problemTitle);

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
      // Remove button if not on problem page
      const existingButton = document.getElementById(CONFIG.BUTTON_ID);
      if (existingButton) {
        existingButton.remove();
        isButtonInjected = false;
        currentProblemTitle = null;
      }
    }
  }, 300);

  // Initial setup
  const initializeExtension = () => {
    if (isProblemPage()) {
      console.log("✅ CodeBuddy: CodeChef problem page detected!");
      setTimeout(injectHintButton, 100);
      setTimeout(injectHintButton, 500);
      setTimeout(injectHintButton, 1000);
    }
  };

  // Set up observers for dynamic content
  const setupObservers = () => {
    // Watch for URL changes
    let lastUrl = window.location.href;
    const checkForURLChange = () => {
      if (lastUrl !== window.location.href) {
        lastUrl = window.location.href;
        handlePageChange();
      }
    };

    setInterval(checkForURLChange, 1000);

    // Watch for DOM changes
    const observer = new MutationObserver(debounce(() => {
      if (isProblemPage() && !isButtonInjected) {
        injectHintButton();
      }
    }, 1000));

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Navigation event listeners
    window.addEventListener('popstate', handlePageChange);
    window.addEventListener('pushstate', handlePageChange);
    window.addEventListener('replacestate', handlePageChange);
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializeExtension();
      setupObservers();
    });
  } else {
    initializeExtension();
    setupObservers();
  }

  console.log("🚀 CodeBuddy: CodeChef extension initialized!");
})();