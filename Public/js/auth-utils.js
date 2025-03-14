// Authentication utilities for handling login, permissions, and role-based access control

// Function to get the token from localStorage
function getToken() {
    const token = localStorage.getItem('token');
    // Debug the token retrieval
    console.log('Token retrieved from localStorage:', token ? 'Token exists' : 'No token found');
    return token;
}

// Function to get the current user information
function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    // Debug the user retrieval
    console.log('User retrieved from localStorage:', userStr ? 'User exists' : 'No user found');
    return userStr ? JSON.parse(userStr) : null;
}

// Function to check if user is authenticated
function isAuthenticated() {
    const isAuth = !!getToken();
    console.log('Authentication check result:', isAuth);
    return isAuth;
}

// Function to check if current user has admin role
function isAdmin() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
}

// Function to check if user has required role
function hasRequiredRole(requiredRole) {
    if (!isAuthenticated()) return false;
    
    const user = getCurrentUser();
    if (requiredRole === 'admin') {
        return user.role === 'admin';
    }
    
    return true; // Regular user role is sufficient
}

// Function to check authorization for specific actions
function canPerformAction(action) {
    if (!isAuthenticated()) return false;
    
    const user = getCurrentUser();
    
    switch (action) {
        case 'delete':
            return user.role === 'admin';
        case 'addMaterial':
            return user.role === 'admin';
        case 'viewTotalPrice':
            return user.role === 'admin';
        case 'viewMonthlyReport':
            return user.role === 'admin';
        default:
            return true;
    }
}

// Function to logout user
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
}

// Function to add authorization header to fetch requests
function authHeader() {
    const token = getToken();
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    // Debug the headers being sent
    console.log('Auth headers:', token ? 'Authorization header added' : 'No authorization header');
    return headers;
}

// Function to store token with cross-browser compatibility in mind
function storeAuthData(token, user) {
    try {
        // Try to clear any existing items first
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Store new values
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        // Verify storage was successful
        const storedToken = localStorage.getItem('token');
        console.log('Token storage verification:', storedToken === token ? 'Success' : 'Failed');
        
        return storedToken === token;
    } catch (error) {
        console.error('Error storing authentication data:', error);
        return false;
    }
}

// Function to make authenticated API requests
async function authenticatedFetch(url, options = {}) {
    // Ensure options.headers exists
    if (!options.headers) {
        options.headers = {};
    }

    // Add authorization header
    const token = getToken();
    options.headers = {
        ...options.headers,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        'Content-Type': 'application/json'
    };

    // Debug the request
    console.log(`Authenticated request to: ${url}`);
    console.log('Request has auth token:', !!token);

    try {
        const response = await fetch(url, options);
        
        // Log the response status
        console.log(`Response status for ${url}: ${response.status}`);
        
        // If response is 401 (Unauthorized), logout and redirect to login
        if (response.status === 401) {
            console.error("Authentication error: Unauthorized access");
            // Try to retrieve the response body for debugging
            try {
                const errorData = await response.clone().text();
                console.error("Server error response:", errorData);
            } catch (e) {
                console.error("Could not read error response");
            }
            logout();
            throw new Error('Your session has expired. Please login again.');
        }
        
        // If response is 403 (Forbidden), throw permission error
        if (response.status === 403) {
            throw new Error('You do not have permission to perform this action.');
        }
        
        return response;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Function to refresh token or retry login if needed
async function tryRefreshToken() {
    try {
        const token = getToken();
        if (!token) return false;
        
        // Attempt to validate the current token with the server
        const response = await fetch('/api/validate-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            // Token is still valid
            return true;
        }
        
        // Token is invalid, attempt to refresh
        const refreshResponse = await fetch('/api/refresh-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (refreshResponse.ok) {
            const data = await refreshResponse.json();
            if (data.token) {
                // Store the new token
                localStorage.setItem('token', data.token);
                return true;
            }
        }
        
        // If we get here, refresh failed
        return false;
    } catch (error) {
        console.error('Error refreshing token:', error);
        return false;
    }
}

// Check for authentication on page load and redirect if needed
document.addEventListener('DOMContentLoaded', () => {
    console.log("Auth utils loaded, checking authentication...");
    
    // Get the current page URL
    const currentPage = window.location.pathname;
    console.log("Current page:", currentPage);
    
    // Pages that don't require authentication
    const publicPages = ['/login', '/html/login.html'];
    
    // If the current page is not a public page and user is not authenticated
    if (!publicPages.some(page => currentPage.includes(page)) && !isAuthenticated()) {
        console.log("Not authenticated, redirecting to login page");
        // Redirect to login page
        window.location.href = '/login';
        return;
    }
    
    // If authenticated, apply role-based UI changes
    if (isAuthenticated()) {
        console.log("Authenticated, applying role-based UI changes");
        applyRoleBasedUIChanges();
    }
});

// Apply role-based changes to UI elements
function applyRoleBasedUIChanges() {
    // Hide elements with 'admin-only' class for non-admin users
    if (!isAdmin()) {
        const adminOnlyElements = document.querySelectorAll('.admin-only');
        adminOnlyElements.forEach(element => {
            element.style.display = 'none';
        });
    }
    
    console.log("Security utilities loaded successfully");
} 