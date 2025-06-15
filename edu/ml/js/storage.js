/**
 * @module Storage
 * @description Storage management for the ML Quiz application
 */

export const STORAGE_KEYS = {
    PROGRESS: 'mlQuizProgress',
    SETTINGS: 'mlQuizSettings'
};

/**
 * Saves data to localStorage with error handling
 * @param {string} key - Storage key
 * @param {*} data - Data to save
 * @returns {boolean} Success status
 */
export function save(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Failed to save to localStorage:', error);
        return false;
    }
}

/**
 * Loads data from localStorage with validation
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if load fails
 * @returns {*} Loaded data or default value
 */
export function load(key, defaultValue = null) {
    try {
        const saved = localStorage.getItem(key);
        if (!saved) return defaultValue;
        
        const data = JSON.parse(saved);
        return validateData(key, data) ? data : defaultValue;
    } catch (error) {
        console.error('Failed to load from localStorage:', error);
        return defaultValue;
    }
}

/**
 * Validates loaded data structure
 * @param {string} key - Storage key
 * @param {*} data - Data to validate
 * @returns {boolean} Validation result
 */
function validateData(key, data) {
    if (key === STORAGE_KEYS.PROGRESS) {
        return data && 
               typeof data.stats === 'object' &&
               typeof data.learningMode === 'object' &&
               Array.isArray(data.learningMode.incorrectQuestions);
    }
    if (key === STORAGE_KEYS.SETTINGS) {
        return data && typeof data === 'object';
    }
    return true;
}

/**
 * Clears specific key from storage
 * @param {string} key - Storage key
 */
export function clear(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error('Failed to clear localStorage:', error);
    }
}

/**
 * Gets storage size info
 * @returns {Object} Storage info
 */
export function getStorageInfo() {
    let totalSize = 0;
    const items = {};
    
    for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            const size = localStorage[key].length + key.length;
            totalSize += size;
            items[key] = size;
        }
    }
    
    return {
        totalSize,
        items,
        formattedSize: formatBytes(totalSize)
    };
}

/**
 * Formats bytes to human readable format
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted string
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}