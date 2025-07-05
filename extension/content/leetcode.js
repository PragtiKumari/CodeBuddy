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
    return window.location.pathname.startsWith("/problems/") && 
           window.location.pathname !== "/problems/";
  };

  const extractProblemTitle = () => {
    // Multiple selectors to try in order of preference
    const selectors = [
      '[data-cy="question-title"]',
      'h1[data-cy="question-title"]',
      '.css-v3d350',
      'h1',
      '.question-title',
      '[class*="title"]',
      // Additional selectors for better coverage
      'div[data-track-load="description_content"] h1',
      '.question-content h1'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        let title = element.textContent.trim();
        
        // Clean up the title - remove numbers, dots, and extra whitespace
        title = title.replace(/^\d+\.\s*/, '').trim();
        
        // Remove difficulty indicators
        title = title.replace(/\s*\(Easy\)|\s*\(Medium\)|\s*\(Hard\)/gi, '').trim();
        
        // If title is too long, it might include description
        if (title.length > 100) {
          title = title.split('\n')[0].trim();
        }
        
        return title;
      }
    }

    // Fallback: extract from URL
    const urlParts = window.location.pathname.split('/');
    if (urlParts.length >= 3) {
      return urlParts[2].split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }

    return null; // Return null instead of "Unknown Problem"
  };

  const createHintButton = () => {
    const button = document.createElement("button");
    button.id = CONFIG.BUTTON_ID;
    button.innerHTML = "💡 Show Hint";
    
    // Enhanced styling
    Object.assign(button.style, {
      position: "fixed",
      top: "120px",
      right: "20px",
      padding: "12px 20px",
      backgroundColor: "#6a0dad",
      color: "white",
      border: "none",
      borderRadius: "12px",
      zIndex: "9999",
      cursor: "pointer",
      fontWeight: "bold",
      fontSize: "14px",
      fontFamily: "system-ui, -apple-system, sans-serif",
      boxShadow: "0 4px 12px rgba(106, 13, 173, 0.3)",
      transition: "all 0.3s ease",
      userSelect: "none"
    });

    // Hover effects
    button.addEventListener("mouseenter", () => {
      button.style.backgroundColor = "#5500aa";
      button.style.transform = "translateY(-2px)";
      button.style.boxShadow = "0 6px 16px rgba(106, 13, 173, 0.4)";
    });

    button.addEventListener("mouseleave", () => {
      button.style.backgroundColor = "#6a0dad";
      button.style.transform = "translateY(0)";
      button.style.boxShadow = "0 4px 12px rgba(106, 13, 173, 0.3)";
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
    
    // Create Shadow DOM to isolate from LeetCode's CSS
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
        color: #6a0dad;
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
    
    // Create the modal HTML
    const modalHTML = `
      <div class="modal-overlay">
        <div class="modal-content">
          <button class="close-button" id="close-btn">×</button>
          <h3 class="modal-title">💡 Hint</h3>
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
    
    // Append to body
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
        "Unable to fetch hint right now. Consider the problem's constraints and think about which data structure might be most efficient.",
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
      console.log("⚠️ Could not extract problem title, retrying...");
      return;
    }

    console.log("✅ CodeBuddy: Injecting hint button for:", problemTitle);
    
    const button = createHintButton();
    button.addEventListener("click", () => fetchHint(problemTitle));
    
    document.body.appendChild(button);
    isButtonInjected = true;
    currentProblemTitle = problemTitle;
  };

  const handlePageChange = debounce(() => {
    if (isProblemPage()) {
      const newTitle = extractProblemTitle();
      
      // If we're on a different problem, re-inject the button
      if (newTitle && newTitle !== currentProblemTitle) {
        const existingButton = document.getElementById(CONFIG.BUTTON_ID);
        if (existingButton) {
          existingButton.remove();
        }
        isButtonInjected = false;
        currentProblemTitle = null;
        
        // Small delay to ensure DOM is updated
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
      console.log("✅ CodeBuddy: Problem page detected on load!");
      // Try multiple times with increasing delays
      setTimeout(injectHintButton, 100);
      setTimeout(injectHintButton, 500);
      setTimeout(injectHintButton, 1000);
    }
  };

  // Set up observers for dynamic content
  const setupObservers = () => {
    // Watch for URL changes (SPA navigation)
    let lastUrl = window.location.href;
    const checkForURLChange = () => {
      if (lastUrl !== window.location.href) {
        lastUrl = window.location.href;
        handlePageChange();
      }
    };

    // Poll for URL changes
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

    // Listen for navigation events
    window.addEventListener('popstate', handlePageChange);
    window.addEventListener('pushstate', handlePageChange);
    window.addEventListener('replacestate', handlePageChange);
  };

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializeExtension();
      setupObservers();
    });
  } else {
    initializeExtension();
    setupObservers();
  }

  console.log("🚀 CodeBuddy: Extension initialized!");
})();