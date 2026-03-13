const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
const numberChars = '0123456789';
const symbolChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

// Local Storage keys
const STORAGE_KEYS = {
    PASSWORD: 'password_generator_last_password',
    HISTORY: 'password_generator_history',
    LENGTH: 'password_generator_length',
    UPPERCASE: 'password_generator_uppercase',
    LOWERCASE: 'password_generator_lowercase',
    NUMBERS: 'password_generator_numbers',
    SYMBOLS: 'password_generator_symbols'
};

function saveToLocalStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.warn('Local Storage not available:', e);
    }
}

function loadFromLocalStorage(key, defaultValue) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
        console.warn('Local Storage read error:', e);
        return defaultValue;
    }
}

function generatePassword() {
    const length = parseInt(document.getElementById('lengthSlider').value);
    const includeUppercase = document.getElementById('uppercase').checked;
    const includeLowercase = document.getElementById('lowercase').checked;
    const includeNumbers = document.getElementById('numbers').checked;
    const includeSymbols = document.getElementById('symbols').checked;

    let charset = '';
    if (includeUppercase) charset += uppercaseChars;
    if (includeLowercase) charset += lowercaseChars;
    if (includeNumbers) charset += numberChars;
    if (includeSymbols) charset += symbolChars;

    if (charset === '') {
        alert('Please select at least one character type!');
        return;
    }

    let password = '';
    const crypto = window.crypto || window.msCrypto;

    // Ensure at least one of each selected type
    const requiredChars = [];
    if (includeUppercase) requiredChars.push(uppercaseChars[Math.floor(Math.random() * uppercaseChars.length)]);
    if (includeLowercase) requiredChars.push(lowercaseChars[Math.floor(Math.random() * lowercaseChars.length)]);
    if (includeNumbers) requiredChars.push(numberChars[Math.floor(Math.random() * numberChars.length)]);
    if (includeSymbols) requiredChars.push(symbolChars[Math.floor(Math.random() * symbolChars.length)]);

    password = requiredChars.join('');

    // Fill remaining length
    for (let i = password.length; i < length; i++) {
        const randomBuffer = new Uint8Array(1);
        crypto.getRandomValues(randomBuffer);
        password += charset[randomBuffer[0] % charset.length];
    }

    // Shuffle (Fisher-Yates)
    for (let i = password.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [password[i], password[j]] = [password[j], password[i]];
    }

    // Save to current field AND history
    document.getElementById('password').value = password;
    saveToLocalStorage(STORAGE_KEYS.PASSWORD, password);
    addToHistory(password, length);
    
    updateStrength(password);
    saveSettings();
}

function addToHistory(password, length) {
    const history = loadFromLocalStorage(STORAGE_KEYS.HISTORY, []);
    const timestamp = new Date().toLocaleString();
    
    // Avoid duplicates
    const exists = history.find(item => item.password === password);
    if (!exists) {
        history.unshift({ password, length, timestamp }); // Add to beginning
        // Keep only last 50 passwords
        if (history.length > 50) {
            history.length = 50;
        }
        saveToLocalStorage(STORAGE_KEYS.HISTORY, history);
        renderHistory();
    }
}

function renderHistory() {
    const history = loadFromLocalStorage(STORAGE_KEYS.HISTORY, []);
    const historyList = document.getElementById('historyList');
    const historyCount = document.getElementById('historyCount');
    
    if (history.length === 0) {
        historyList.innerHTML = `
            <div class="empty-state">
                <p>No passwords saved yet</p>
                <small>Generate some passwords to see them here!</small>
            </div>
        `;
    } else {
        historyList.innerHTML = history.map((item, index) => `
            <div class="history-item" onclick="usePassword('${item.password.replace(/'/g, "\\'")}', ${item.length})">
                <div class="history-preview">${truncatePassword(item.password, 30)}</div>
                <div class="history-meta">
                    <span class="history-length">${item.length} chars</span>
                    <span style="opacity: 0.7; font-size: 0.8rem;">${formatTimeAgo(item.timestamp)}</span>
                    <div class="history-actions">
                        <button class="history-btn history-copy" onclick="event.stopPropagation(); copyHistoryPassword('${item.password.replace(/'/g, "\\'")}')">
                            📋
                        </button>
                        <button class="history-btn history-delete" onclick="event.stopPropagation(); deleteHistoryItem(${index})">
                            🗑️
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    historyCount.textContent = `${history.length} saved`;
}

function truncatePassword(password, maxLength) {
    if (password.length <= maxLength) return password;
    return password.slice(0, maxLength - 3) + '...';
}

function formatTimeAgo(timestamp) {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
}

function usePassword(password, length) {
    document.getElementById('password').value = password;
    document.getElementById('lengthSlider').value = length;
    document.getElementById('lengthDisplay').textContent = length;
    updateStrength(password);
}

function copyHistoryPassword(password) {
    navigator.clipboard.writeText(password).then(() => {
        showToast('Copied from history!');
    });
}

function deleteHistoryItem(index) {
    const history = loadFromLocalStorage(STORAGE_KEYS.HISTORY, []);
    history.splice(index, 1);
    saveToLocalStorage(STORAGE_KEYS.HISTORY, history);
    renderHistory();
}

function clearHistory() {
    if (confirm('Clear all saved passwords? This cannot be undone.')) {
        saveToLocalStorage(STORAGE_KEYS.HISTORY, []);
        renderHistory();
        showToast('History cleared!');
    }
}

function showToast(message) {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; background: rgba(46, 213, 115, 0.95);
        color: white; padding: 12px 20px; border-radius: 8px; font-weight: 600;
        z-index: 10000; transform: translateX(400px); transition: transform 0.3s ease;
        backdrop-filter: blur(10px); box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.style.transform = 'translateX(0)', 100);
    setTimeout(() => {
        toast.style.transform = 'translateX(400px)';
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 2500);
}

// Existing functions (saveSettings, loadSettings, copyPassword, updateStrength remain the same)
function saveSettings() {
    saveToLocalStorage(STORAGE_KEYS.LENGTH, parseInt(document.getElementById('lengthSlider').value));
    saveToLocalStorage(STORAGE_KEYS.UPPERCASE, document.getElementById('uppercase').checked);
    saveToLocalStorage(STORAGE_KEYS.LOWERCASE, document.getElementById('lowercase').checked);
    saveToLocalStorage(STORAGE_KEYS.NUMBERS, document.getElementById('numbers').checked);
    saveToLocalStorage(STORAGE_KEYS.SYMBOLS, document.getElementById('symbols').checked);
}

function loadSettings() {
    const savedLength = loadFromLocalStorage(STORAGE_KEYS.LENGTH, 16);
    document.getElementById('lengthSlider').value = savedLength;
    document.getElementById('lengthDisplay').textContent = savedLength;

    document.getElementById('uppercase').checked = loadFromLocalStorage(STORAGE_KEYS.UPPERCASE, true);
    document.getElementById('lowercase').checked = loadFromLocalStorage(STORAGE_KEYS.LOWERCASE, true);
    document.getElementById('numbers').checked = loadFromLocalStorage(STORAGE_KEYS.NUMBERS, true);
    document.getElementById('symbols').checked = loadFromLocalStorage(STORAGE_KEYS.SYMBOLS, true);

    const savedPassword = loadFromLocalStorage(STORAGE_KEYS.PASSWORD, '');
    if (savedPassword) {
        document.getElementById('password').value = savedPassword;
        updateStrength(savedPassword);
    }
}

function copyPassword() {
    const passwordField = document.getElementById('password');
    passwordField.select();
    passwordField.setSelectionRange(0, 99999);
        navigator.clipboard.writeText(passwordField.value).then(() => {
        const btn = document.querySelector('.btn-copy');
        const originalText = btn.innerHTML;
        btn.innerHTML = '✅ Copied!';
        btn.style.background = 'rgba(46, 213, 115, 0.3)';
        btn.style.color = '#2ed573';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = 'rgba(0, 212, 255, 0.2)';
            btn.style.color = '#00d4ff';
        }, 2000);
    }).catch(() => {
        document.execCommand('copy');
    });
}

function updateStrength(password) {
    const length = password.length;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSymbols = /[^A-Za-z0-9]/.test(password);

    let score = 0;
    if (length >= 12) score += 2;
    if (length >= 16) score += 1;
    if (length >= 24) score += 1;
    if (hasUpper && hasLower) score += 1;
    if (hasNumbers) score += 1;
    if (hasSymbols) score += 1;
    if (length >= 12 && hasNumbers && hasSymbols) score += 1;

    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');

    strengthFill.className = 'strength-fill';
    
    let strengthClass, strengthLabel, textColor;
    
    if (score >= 8) {
        strengthClass = 'strength-very-strong';
        strengthLabel = '🔒 Very Strong';
        textColor = '#7b68ee';
    } else if (score >= 6) {
        strengthClass = 'strength-strong';
        strengthLabel = '🛡️ Strong';
        textColor = '#00d4ff';
    } else if (score >= 4) {
        strengthClass = 'strength-good';
        strengthLabel = '✅ Good';
        textColor = '#2ed573';
    } else if (score >= 2) {
        strengthClass = 'strength-fair';
        strengthLabel = '⚠️ Fair';
        textColor = '#ffa502';
    } else {
        strengthClass = 'strength-weak';
        strengthLabel = '❌ Weak';
        textColor = '#ff4757';
    }

    strengthFill.classList.add(strengthClass);
    strengthText.textContent = strengthLabel;
    strengthText.style.color = textColor;

    const percentage = Math.min((score / 10) * 100, 100);
    strengthFill.style.width = percentage + '%';
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    renderHistory(); // Load history on page load
    
    const lengthSlider = document.getElementById('lengthSlider');
    
    lengthSlider.addEventListener('input', function() {
        document.getElementById('lengthDisplay').textContent = this.value;
        generatePassword();
    });

    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', generatePassword);
    });

    if (!loadFromLocalStorage(STORAGE_KEYS.PASSWORD, '')) {
        generatePassword();
    }
});

// Keyboard Shortcuts
document.addEventListener('keydown', function(e) {
    if (e.target.matches('input')) return;
    
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        generatePassword();
    }
    if ((e.key === 'c' || e.key === 'C') && e.ctrlKey === false) {
        e.preventDefault();
        copyPassword();
    }
});

// Save before unload
window.addEventListener('beforeunload', saveSettings);

// Auto-generate if no password
window.addEventListener('load', function() {
    if (!document.getElementById('password').value) {
        generatePassword();
    }
});