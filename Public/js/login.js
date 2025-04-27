document.addEventListener('DOMContentLoaded', () => {
    console.log('Login page loaded, checking authentication status...');
    
    // Check if user is already logged in
    // Try to get auth status either from token or via auth-utils.js if loaded
    let isAuthed = false;
    
    if (typeof isAuthenticated === 'function') {
        // Use the auth-utils function if available
        isAuthed = isAuthenticated();
        console.log('Using auth-utils for authentication check:', isAuthed);
    } else {
        // Fallback to basic token check
        const token = localStorage.getItem('token');
        isAuthed = !!token;
        console.log('Basic token check:', isAuthed);
    }
    
    if (isAuthed) {
        redirectBasedOnRole();
    }

    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    // Handle login form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        // Reset error message
        errorMessage.style.display = 'none';
        
        try {
            console.log('Attempting login for user:', username);
            
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
                credentials: 'include' // Include cookies in the request
            });
            
            const data = await response.json();
            console.log('Login response status:', response.status);
            
            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }
            
            // Use the improved token storage function if available
            let storageSuccess = false;
            if (typeof storeAuthData === 'function') {
                console.log('Using enhanced storage method');
                storageSuccess = storeAuthData(data.token, data.user);
            } else {
                console.log('Using standard storage method');
                try {
                    // Save authentication data using standard method
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    
                    // Store token and user data if provided by the server
                    if (data.token) {
                        localStorage.setItem('token', data.token);
                    }
                    
                    if (data.user) {
                        localStorage.setItem('user', JSON.stringify(data.user));
                    }
                    
                    storageSuccess = true;
                } catch (storageError) {
                    console.error('Error storing auth data:', storageError);
                    storageSuccess = false;
                }
            }
            
            // Even if localStorage fails, we might still have HTTP-only cookies
            if (!storageSuccess && !data.token) {
                console.log('Using HTTP-only cookie for authentication');
                // We can still proceed if server is using HTTP-only cookies
                storageSuccess = data.success === true;
            }
            
            if (!storageSuccess) {
                throw new Error('Failed to store authentication data. Please check your browser settings.');
            }
            
            // Redirect based on user role
            redirectBasedOnRole();
            
        } catch (error) {
            console.error('Login error:', error);
            // Display error message
            errorMessage.textContent = error.message;
            errorMessage.style.display = 'block';
        }
    });

    // Register link click handler (shows message instead of registration)
    const registerLink = document.getElementById('register-link');
    if (registerLink) {
        registerLink.addEventListener('click', (e) => {
            e.preventDefault();
            alert('Please contact your administrator to create an account.');
        });
    }
});

// Function to redirect based on user role
function redirectBasedOnRole() {
    try {
        let user = null;
        
        // Try to get user from auth-utils if available
        if (typeof getCurrentUser === 'function') {
            user = getCurrentUser();
            console.log('Got user from auth-utils:', user ? 'Found' : 'Not found');
        } else {
            // Fallback to localStorage
            const userStr = localStorage.getItem('user');
            user = userStr ? JSON.parse(userStr) : null;
            console.log('User data from localStorage:', user ? 'Available' : 'Not available');
        }
        
        if (!user) {
            // If we can't determine the user, try to fetch current user from API
            console.log('No user data found, attempting to fetch from API');
            
            // Make an API call to get current user
            fetch('/api/auth/current-user', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include' // Include cookies
            })
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    // If API call fails, redirect to login
                    throw new Error('Failed to get user data');
                }
            })
            .then(data => {
                if (data.user) {
                    // Store user data
                    localStorage.setItem('user', JSON.stringify(data.user));
                    console.log('Redirecting user with role from API:', data.user.role || 'unknown');
                    window.location.href = '/index';
                } else {
                    throw new Error('No user data returned from API');
                }
            })
            .catch(error => {
                console.error('Error fetching user data:', error);
                window.location.href = '/login';
            });
            
            return; // Return while fetch is in progress
        }
        
        console.log('Redirecting user with role:', user.role || 'unknown');
        
        // Redirect to index page
        window.location.href = '/index';
    } catch (error) {
        console.error('Error during redirect:', error);
        window.location.href = '/login';
    }
}

// Function to check if user has required role
function hasRequiredRole(requiredRole) {
    try {
        // Use the auth-utils function if available
        if (typeof getCurrentUser === 'function') {
            const user = getCurrentUser();
            
            if (!user) return false;
            
            if (requiredRole === 'admin') {
                return user.role === 'admin';
            }
            
            return true; // Regular user role is sufficient
        } else {
            // Fallback to basic localStorage check
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            
            if (!user) return false;
            
            if (requiredRole === 'admin') {
                return user.role === 'admin';
            }
            
            return true; // Regular user role is sufficient
        }
    } catch (error) {
        console.error('Error checking user role:', error);
        return false;
    }
} 