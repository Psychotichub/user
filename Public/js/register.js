document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated and has admin role
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token) {
        window.location.href = '/login';
        return;
    }
    
    // For security, only show this page to admins
    if (user.role !== 'admin') {
        window.location.href = '/index';
        return;
    }
    
    const registerForm = document.getElementById('register-form');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');
    
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Hide any previous messages
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const passwordConfirm = document.getElementById('password-confirm').value;
        const role = document.getElementById('role').value;
        
        // Basic validation
        if (!username || !password) {
            errorMessage.textContent = 'Username and password are required';
            errorMessage.style.display = 'block';
            return;
        }
        
        if (password !== passwordConfirm) {
            errorMessage.textContent = 'Passwords do not match';
            errorMessage.style.display = 'block';
            return;
        }
        
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ username, password, role })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to create user');
            }
            
            // Show success message
            successMessage.textContent = `User "${username}" created successfully with role: ${role}`;
            successMessage.style.display = 'block';
            
            // Reset form
            registerForm.reset();
            
        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.style.display = 'block';
        }
    });
}); 