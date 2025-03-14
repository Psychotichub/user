document.addEventListener('DOMContentLoaded', () => {
    console.log('Login page loaded, checking authentication status...');
    
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    console.log('Token on login page:', token ? 'Token exists' : 'No token found');
    
    if (token) {
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
                body: JSON.stringify({ username, password })
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
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    storageSuccess = true;
                } catch (storageError) {
                    console.error('Error storing auth data:', storageError);
                    storageSuccess = false;
                }
            }
            
            if (!storageSuccess) {
                throw new Error('Failed to store authentication data. Please check your browser settings.');
            }
            
            // Verify storage was successful
            const storedToken = localStorage.getItem('token');
            console.log('Token storage verification:', storedToken ? 'Success' : 'Failed');
            
            if (!storedToken) {
                throw new Error('Authentication data could not be stored in your browser.');
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
    registerLink.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Please contact your administrator to create an account.');
    });
});

// Function to redirect based on user role
function redirectBasedOnRole() {
    try {
        const userStr = localStorage.getItem('user');
        console.log('User data for redirect:', userStr ? 'Available' : 'Not available');
        
        const user = userStr ? JSON.parse(userStr) : null;
        
        if (!user) {
            // If no user data, redirect to login
            console.error('No user data found, redirecting to login');
            window.location.href = '/login';
            return;
        }
        
        console.log('Redirecting user with role:', user.role || 'unknown');
        
        // Redirect to index page instead of root
        window.location.href = '/index';
    } catch (error) {
        console.error('Error during redirect:', error);
        window.location.href = '/login';
    }
}

// Function to check if user has required role
function hasRequiredRole(requiredRole) {
    try {
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        
        if (!user) return false;
        
        if (requiredRole === 'admin') {
            return user.role === 'admin';
        }
        
        return true; // Regular user role is sufficient
    } catch (error) {
        console.error('Error checking user role:', error);
        return false;
    }
} 