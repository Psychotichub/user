// Authentication debugging utility
// Include this script in your HTML to debug authentication issues

console.log('=== Authentication Debug Utility Loaded ===');

// Function to check authentication status
function debugAuthStatus() {
    console.log('--- Authentication Status Check ---');
    
    // Check localStorage
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    console.log('localStorage token:', token ? 'Present' : 'Missing');
    console.log('localStorage user:', user ? 'Present' : 'Missing');
    
    if (user) {
        try {
            const userObj = JSON.parse(user);
            console.log('User data:', userObj);
        } catch (e) {
            console.error('Error parsing user data:', e);
        }
    }
    
    // Check if auth functions are available
    console.log('isAuthenticated function:', typeof isAuthenticated === 'function' ? 'Available' : 'Not available');
    console.log('getCurrentUser function:', typeof getCurrentUser === 'function' ? 'Available' : 'Not available');
    console.log('verifyAuthentication function:', typeof verifyAuthentication === 'function' ? 'Available' : 'Not available');
    
    // Test authentication if functions are available
    if (typeof isAuthenticated === 'function') {
        console.log('isAuthenticated result:', isAuthenticated());
    }
    
    if (typeof getCurrentUser === 'function') {
        console.log('getCurrentUser result:', getCurrentUser());
    }
    
    // Check current page
    console.log('Current page:', window.location.pathname);
    console.log('Current URL:', window.location.href);
    
    console.log('--- End Authentication Status Check ---');
}

// Function to test server authentication
async function testServerAuth() {
    console.log('--- Testing Server Authentication ---');
    
    try {
        const response = await fetch('/api/auth/me', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        
        console.log('Server response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Server response data:', data);
        } else {
            const errorData = await response.json();
            console.log('Server error:', errorData);
        }
    } catch (error) {
        console.error('Error testing server auth:', error);
    }
    
    console.log('--- End Server Authentication Test ---');
}

// Function to clear all authentication data
function clearAuthData() {
    console.log('--- Clearing Authentication Data ---');
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Also try to clear cookies by calling logout
    fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
    }).catch(error => {
        console.error('Error calling logout:', error);
    });
    
    console.log('Authentication data cleared');
    console.log('--- End Clear Authentication Data ---');
}

// Make functions available globally
window.debugAuthStatus = debugAuthStatus;
window.testServerAuth = testServerAuth;
window.clearAuthData = clearAuthData;

// Auto-run debug on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('=== Page Loaded - Running Auth Debug ===');
    debugAuthStatus();
    
    // Wait a bit then test server auth
    setTimeout(() => {
        testServerAuth();
    }, 1000);
});

console.log('Debug functions available:');
console.log('- debugAuthStatus() - Check current auth status');
console.log('- testServerAuth() - Test server authentication');
console.log('- clearAuthData() - Clear all auth data'); 