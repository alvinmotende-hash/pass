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

// MAIN GENERATE FUNCTION - Called by slider/checkbox changes (NO HISTORY SAVE)
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

    // ONLY save current password (NOT history)
    document.getElementById('password').value = password;
    saveToLocalStorage(STORAGE_KEYS.PASSWORD, password);
    updateStrength(password);
    saveSettings();
}

// BUTTON-ONLY FUNCTION - Saves to HISTORY
function generateSecurePassword() {
    generatePassword(); // Generate first
    const password = document.getElementById('password').value;
    const length = parseInt(document.getElementById('lengthSlider').value);
    
    // NOW add to history (only from button click)
    addToHistory(password, length);
    showToast('✅ Password saved to history!');
}

// History functions
function addToHistory(password, length) {
    const history = loadFromLocalStorage(STORAGE_KEYS.HISTORY, []);
    const timestamp = new Date().toLocaleString();
    
    // Avoid duplicates
    const exists = history.find(item => item.password === password);
    if (!exists) {
        history.unshift({ password, length, timestamp });
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
                <small>Click "Generate Secure Password" to save!</small>
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
    showToast('Password loaded from history!');
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

// Settings functions
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
    renderHistory();
    
    const lengthSlider = document.getElementById('lengthSlider');
    
    lengthSlider.addEventListener('input', function() {
        document.getElementById('lengthDisplay').textContent = this.value;
        generatePassword(); // Uses regular generate (no history)
    });

    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', generatePassword); // Uses regular generate (no history)
    });

    // Initial load
    if (!loadFromLocalStorage(STORAGE_KEYS.PASSWORD, '')) {
        generatePassword();
    }
});

// Keyboard Shortcuts
document.addEventListener('keydown', function(e) {
    if (e.target.matches('input')) return;
    
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        generateSecurePassword(); // Button-only version (saves to history)
    }
    if ((e.key === 'c' || e.key === 'C') && e.ctrlKey === false) {
        e.preventDefault();
        copyPassword();
    }
});

window.addEventListener('beforeunload', saveSettings);
window.addEventListener('load', function() {
    if (!document.getElementById('password').value) {
        generatePassword();
    }
});
// Add these functions to your existing script.js

// 1. Theme System
function applyTheme(theme) {
    document.body.className = theme;
    saveToLocalStorage('password_generator_theme', theme);
}

document.getElementById('themeSelect').addEventListener('change', function() {
    applyTheme(this.value);
});

// 2. QR Code Generator (needs QR library - CDN in HTML head)
/* Add to HTML head: <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script> */

function generateQR() {
    const password = document.getElementById('password').value;
    const canvas = document.getElementById('qrCanvas');
    
    QRCode.toCanvas(canvas, password, {
        width: 150,
        margin: 1,
        color: {
            dark: '#000000',
            light: '#ffffff'
        }
    }, (error) => {
        if (error) console.error(error);
        else canvas.style.display = 'block';
    });
}

// 3. Advanced Quality Score
function calculateQualityScore(password) {
    const lengthScore = Math.min(password.length * 4, 40);
    const charsetScore = new Set(password).size * 2;
    const entropy = calculateEntropy(password);
    const patternScore = hasGoodPattern(password) ? 20 : 0;
    
    const total = Math.min((lengthScore + charsetScore + entropy + patternScore), 100);
    document.getElementById('qualityScore').textContent = `${Math.round(total)}%`;
    document.getElementById('entropyBits').textContent = `${Math.round(entropy)} bits`;
    
    return total;
}

function calculateEntropy(password) {
    const charsetSize = new Set(password).size;
    return password.length * Math.log2(charsetSize);
}

function hasGoodPattern(password) {
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNum = /\d/.test(password);
    const hasSym = /[^A-Za-z0-9]/.test(password);
    return hasUpper && hasLower && hasNum && hasSym;
}

// Update strength function to include quality
const _updateStrength = updateStrength;
updateStrength = function(password) {
    _updateStrength(password);
    calculateQualityScore(password);
};

// 4. Usage Analytics
function updateAnalytics() {
    const history = loadFromLocalStorage(STORAGE_KEYS.HISTORY, []);
    const avgLength = history.length ? 
        Math.round(history.reduce((sum, item) => sum + item.length, 0) / history.length) : 0;
    
    console.log(`📊 Stats: ${history.length} passwords, avg ${avgLength} chars`);
}

// 5. Export/Import
function exportData() {
    const data = {
        history: loadFromLocalStorage(STORAGE_KEYS.HISTORY, []),
        settings: {
            length: loadFromLocalStorage(STORAGE_KEYS.LENGTH, 16),
            uppercase: loadFromLocalStorage(STORAGE_KEYS.UPPERCASE, true),
            lowercase: loadFromLocalStorage(STORAGE_KEYS.LOWERCASE, true),
            numbers: loadFromLocalStorage(STORAGE_KEYS.NUMBERS, true),
            symbols: loadFromLocalStorage(STORAGE_KEYS.SYMBOLS, true),
            theme: loadFromLocalStorage('password_generator_theme', 'dark')
        },
        stats: {
            totalGenerated: loadFromLocalStorage(STORAGE_KEYS.HISTORY, []).length,
            exportDate: new Date().toISOString()
        }
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `password-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported! 💾');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.history) {
                saveToLocalStorage(STORAGE_KEYS.HISTORY, data.history);
                renderHistory();
            }
            if (data.settings) {
                Object.keys(data.settings).forEach(key => {
                    if (key === 'length') {
                        document.getElementById('lengthSlider').value = data.settings[key];
                        document.getElementById('lengthDisplay').textContent = data.settings[key];
                    } else {
                        const checkbox = document.getElementById(key);
                        if (checkbox) checkbox.checked = data.settings[key];
                    }
                });
                applyTheme(data.settings.theme || 'dark');
            }
            showToast('Data imported successfully! 🎉');
            generatePassword();
        } catch (err) {
            alert('Invalid file format!');
        }
    };
    reader.readAsText(file);
}

// Load theme on startup
document.addEventListener('DOMContentLoaded', function() {
    const savedTheme = loadFromLocalStorage('password_generator_theme', 'dark');
    applyTheme(savedTheme);
    updateAnalytics();
});