// Authentication utilities for handling login, permissions, and role-based access control

// Global flag to prevent multiple redirects
let isRedirecting = false;

// Function to get the token from localStorage or cookies
function getToken() {
    // Try getting from localStorage first
    const token = localStorage.getItem('token');
    
    // Debug the token retrieval
    //console.log('Token retrieved from localStorage:', token ? 'Token exists' : 'No token found');
    
    return token;
}

// Function to decode JWT token (basic implementation)
function decodeToken(token) {
    try {
        // Basic JWT decode (for client-side validation)
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Error decoding token:', error);
        return null;
    }
}

// Function to get the current user information
function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    
    // If user data exists in localStorage, use it
    if (userStr) {
        //console.log('User retrieved from localStorage');
        return JSON.parse(userStr);
    }
    
    // Otherwise try to get user info from token
    const token = getToken();
    if (token) {
        const decoded = decodeToken(token);
        if (decoded) {
            //console.log('User retrieved from token payload');
            return {
                id: decoded.id,
                username: decoded.username,
                role: decoded.role
            };
        }
    }
    
    //console.log('No user found');
    return null;
}

// Function to check if user is authenticated
function isAuthenticated() {
    const token = getToken();
    
    // If no token, user is not authenticated
    if (!token) {
        //console.log('No token found, not authenticated');
        return false;
    }
    
    // Check if token is valid by decoding it
    const decoded = decodeToken(token);
    const isAuth = !!decoded;
    
    //console.log('Authentication check result:', isAuth);
    return isAuth;
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

// Function to check if user is admin
function isAdmin() {
    return hasRequiredRole('admin');
}

// Function to apply role-based UI changes
function applyRoleBasedUIChanges() {
    try {
        const user = getCurrentUser();
        if (!user) return;
        
        const isAdminUser = user.role === 'admin';
        
        // Hide admin-only elements for non-admin users
        if (!isAdminUser) {
            const adminElements = document.querySelectorAll('.admin-only');
            adminElements.forEach(el => {
                el.style.display = 'none';
            });
        }
        
        // Show user-specific elements
        const userElements = document.querySelectorAll('.user-only');
        userElements.forEach(el => {
            el.style.display = 'block';
        });
        
    } catch (err) {
        console.error('Error applying role-based UI:', err);
    }
}

// Function to logout user
function logout() {
    // Prevent multiple logout calls
    if (isRedirecting) return;
    isRedirecting = true;
    
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Also try to clear HTTP-only cookie by making a fetch request
    fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include' // Include cookies
    }).catch(error => {
        console.error('Error logging out:', error);
    }).finally(() => {
        // Redirect to login page
        window.location.href = '/login';
    });
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
        //console.log('Token storage verification:', storedToken === token ? 'Success' : 'Failed');
        
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
    
    // Always include credentials to send cookies
    options.credentials = 'include';

    // Debug the request
    //console.log(`Authenticated request to: ${url}`);
    //console.log('Request has auth token:', !!token);

    try {
        const response = await fetch(url, options);
        
        // Log the response status
        //console.log(`Response status for ${url}: ${response.status}`);
        
        // Handle authentication errors
        if (response.status === 401) {
            console.error("Authentication error: Unauthorized access");
            
            // Try to refresh token first before logging out
            const refreshed = await tryRefreshToken();
            if (refreshed) {
                // Retry the original request with the new token
                const newToken = getToken();
                options.headers['Authorization'] = `Bearer ${newToken}`;
                return fetch(url, options);
            }
            
            // If refresh failed, logout
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

// Function to refresh token
async function tryRefreshToken() {
    try {
        const token = getToken();
        if (!token) return false;
        
        // Attempt to refresh token
        const response = await fetch('/api/auth/refresh-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include' // Include cookies
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.token) {
                // Store the new token
                localStorage.setItem('token', data.token);
                if (data.user) {
                    localStorage.setItem('user', JSON.stringify(data.user));
                }
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

// Function to verify authentication with server
async function verifyAuthentication() {
    try {
        const response = await fetch('/api/auth/me', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.user) {
                // Update localStorage with fresh user data
                localStorage.setItem('user', JSON.stringify(data.user));
                return true;
            }
        }
        
        return false;
    } catch (error) {
        console.error('Error verifying authentication:', error);
        return false;
    }
}

// Check for authentication on page load and redirect if needed
document.addEventListener('DOMContentLoaded', async () => {
    //console.log("Auth utils loaded, checking authentication...");
    
    // Get the current page URL
    const currentPage = window.location.pathname;
    //console.log("Current page:", currentPage);
    
    // Pages that don't require authentication
    const publicPages = ['/login', '/html/login.html'];
    
    // If the current page is not a public page and user is not authenticated
    if (!publicPages.some(page => currentPage.includes(page))) {
        if (!isAuthenticated()) {
            //console.log("Not authenticated, redirecting to login page");
            if (!isRedirecting) {
                isRedirecting = true;
                window.location.href = '/login';
            }
            return;
        }
        
        // If we have a token, verify it with the server
        const isValid = await verifyAuthentication();
        if (!isValid) {
            //console.log("Token invalid, clearing auth data and redirecting to login");
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (!isRedirecting) {
                isRedirecting = true;
                window.location.href = '/login';
            }
            return;
        }
    }
    
    // If authenticated, apply role-based UI changes
    if (isAuthenticated()) {
        //console.log("Authenticated, applying role-based UI changes");
        applyRoleBasedUIChanges();
    }
}); 