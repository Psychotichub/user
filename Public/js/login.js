document.addEventListener('DOMContentLoaded', () => {
    console.log('=== Login Page Loaded ===');
    console.log('Auth-utils loaded:', typeof isAuthenticated === 'function');
    console.log('getCurrentUser available:', typeof getCurrentUser === 'function');
    console.log('verifyAuthentication available:', typeof verifyAuthentication === 'function');
    
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
        const user = localStorage.getItem('user');
        isAuthed = !!(token && user);
        console.log('Basic token check:', isAuthed);
        console.log('Token present:', !!token);
        console.log('User present:', !!user);
    }
    
    if (isAuthed) {
        console.log('User appears to be authenticated, redirecting...');
        redirectBasedOnRole();
    } else {
        console.log('User not authenticated, staying on login page');
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
            
            console.log('Login successful, redirecting...');
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
        console.log('=== Redirecting based on role ===');
        // Use the improved authentication verification
        if (typeof verifyAuthentication === 'function') {
            console.log('Using verifyAuthentication function');
            verifyAuthentication().then(isValid => {
                if (isValid) {
                    console.log('Authentication verified, redirecting to index');
                    window.location.href = '/index';
                } else {
                    console.log('Authentication failed, staying on login page');
                    // Clear any invalid auth data
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                }
            }).catch(error => {
                console.error('Error verifying authentication:', error);
                // Clear any invalid auth data
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            });
        } else {
            console.log('verifyAuthentication not available, using fallback');
            // Fallback to basic check
            if (typeof getCurrentUser === 'function') {
                const user = getCurrentUser();
                if (user) {
                    console.log('Redirecting user with role:', user.role || 'unknown');
                    window.location.href = '/index';
                } else {
                    console.log('No user data found, staying on login page');
                }
            } else {
                console.log('getCurrentUser not available, checking localStorage directly');
                // If auth-utils is not loaded, check localStorage directly
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    try {
                        const user = JSON.parse(userStr);
                        console.log('Redirecting user with role from localStorage:', user.role || 'unknown');
                        window.location.href = '/index';
                    } catch (error) {
                        console.error('Error parsing user data:', error);
                        localStorage.removeItem('user');
                    }
                } else {
                    console.log('No user data found, staying on login page');
                }
            }
        }
    } catch (error) {
        console.error('Error during redirect:', error);
        // Clear any invalid auth data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
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