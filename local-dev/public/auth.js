// auth.js - Frontend authentication handling

// Store the JWT token in localStorage
function setToken(token) {
    localStorage.setItem('token', token);
}

// Get the stored JWT token
function getToken() {
    return localStorage.getItem('token');
}

// Remove the stored JWT token
function removeToken() {
    localStorage.removeItem('token');
}

// Check if user is logged in
function isLoggedIn() {
    const token = getToken();
    if (!token) return false;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expirationTime = payload.exp * 1000; // Convert to milliseconds
        return expirationTime > Date.now();
    } catch (e) {
        console.error('Token validation error:', e);
        removeToken(); // Clear invalid token
        return false;
    }
}

// Get current user's role
function getUserRole() {
    const token = getToken();
    if (!token) return null;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.role;
    } catch (e) {
        console.error('Token validation error:', e);
        removeToken(); // Clear invalid token
        return null;
    }
}

// Login function
async function login(username, password) {
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ login: username, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }

        if (!data.data || !data.data.token) {
            throw new Error('Invalid server response: No token received');
        }

        setToken(data.data.token);
        return data;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

// Logout function
function logout() {
    removeToken();
    window.location.href = '/login.html';
}

// Get current user's profile
async function getCurrentUser() {
    try {
        const token = getToken();
        if (!token || !isLoggedIn()) {
            throw new Error('Not authenticated');
        }

        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user profile');
        }

        const { data } = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching user profile:', error);
        throw error;
    }
}

// Update current user's profile
async function updateProfile(userData) {
    try {
        const response = await fetch('/api/auth/me', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`,
            },
            body: JSON.stringify(userData),
        });

        if (!response.ok) {
            throw new Error('Failed to update profile');
        }

        return await response.json();
    } catch (error) {
        console.error('Error updating profile:', error);
        throw error;
    }
}

// Add authentication headers to fetch requests
function addAuthHeader(headers = {}) {
    const token = getToken();
    if (token) {
        return {
            ...headers,
            'Authorization': `Bearer ${token}`,
        };
    }
    return headers;
}

// Check if user has required role
function hasRole(requiredRole) {
    const userRole = getUserRole();
    if (!userRole) return false;
    
    // Define role hierarchy
    const roles = {
        'admin': 3,
        'manager': 2,
        'user': 1
    };
    
    return roles[userRole] >= roles[requiredRole];
}

// Export functions
window.auth = {
    login,
    logout,
    isLoggedIn,
    getToken,
    getCurrentUser,
    updateProfile,
    addAuthHeader,
    hasRole,
    getUserRole
}; 