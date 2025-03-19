// users.js - Frontend user management

// Load users list
async function loadUsers() {
    if (!auth.hasRole('admin')) {
        document.getElementById('users').innerHTML = '<p class="text-center">Access denied</p>';
        return;
    }

    try {
        const response = await fetch('/api/auth/users', {
            headers: auth.addAuthHeader()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch users');
        }

        const users = await response.json();
        displayUsers(users);
    } catch (error) {
        console.error('Error loading users:', error);
        showError('Failed to load users');
    }
}

// Display users in a table
function displayUsers(users) {
    const usersTable = `
        <table class="table table-striped">
            <thead>
                <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(user => `
                    <tr>
                        <td>${user.username}</td>
                        <td>${user.email}</td>
                        <td><span class="badge bg-${getRoleBadgeColor(user.role)}">${user.role}</span></td>
                        <td>${user.department || '-'}</td>
                        <td>
                            <span class="badge bg-${user.is_active ? 'success' : 'danger'}">
                                ${user.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </td>
                        <td>${user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}</td>
                        <td>
                            <button class="btn btn-sm btn-warning" onclick="showEditUserForm('${user.id}')">
                                Edit
                            </button>
                            <button class="btn btn-sm btn-${user.is_active ? 'danger' : 'success'}" 
                                    onclick="toggleUserStatus('${user.id}', ${!user.is_active})">
                                ${user.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('usersList').innerHTML = usersTable;
}

// Get badge color based on role
function getRoleBadgeColor(role) {
    const colors = {
        'admin': 'danger',
        'manager': 'warning',
        'user': 'info'
    };
    return colors[role] || 'secondary';
}

// Show add user form
function showAddUserForm() {
    if (!auth.hasRole('admin')) {
        showError('You do not have permission to add users');
        return;
    }

    const modalContent = `
        <div class="modal-header">
            <h5 class="modal-title">Add New User</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
            <form id="addUserForm">
                <div class="mb-3">
                    <label class="form-label">Username</label>
                    <input type="text" class="form-control" name="username" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">Email</label>
                    <input type="email" class="form-control" name="email" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">Password</label>
                    <input type="password" class="form-control" name="password" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">Role</label>
                    <select class="form-select" name="role" required>
                        <option value="user">User</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label class="form-label">Department</label>
                    <input type="text" class="form-control" name="department">
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" onclick="addUser()">Add User</button>
        </div>
    `;

    const modalElement = document.getElementById('assetModal');
    modalElement.querySelector('.modal-content').innerHTML = modalContent;
    
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
}

// Add new user
async function addUser() {
    if (!auth.hasRole('admin')) {
        showError('You do not have permission to add users');
        return;
    }

    const form = document.getElementById('addUserForm');
    const formData = new FormData(form);
    const userData = Object.fromEntries(formData.entries());

    try {
        const response = await fetch('/api/auth/users', {
            method: 'POST',
            headers: auth.addAuthHeader({
                'Content-Type': 'application/json'
            }),
            body: JSON.stringify(userData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to add user');
        }

        bootstrap.Modal.getInstance(document.getElementById('assetModal')).hide();
        showSuccess('User added successfully');
        await loadUsers();
    } catch (error) {
        console.error('Error adding user:', error);
        showError(error.message);
    }
}

// Show edit user form
async function showEditUserForm(userId) {
    if (!auth.hasRole('admin')) {
        showError('You do not have permission to edit users');
        return;
    }

    try {
        const response = await fetch(`/api/auth/users/${userId}`, {
            headers: auth.addAuthHeader()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user details');
        }

        const user = await response.json();

        const modalContent = `
            <div class="modal-header">
                <h5 class="modal-title">Edit User - ${user.username}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form id="editUserForm">
                    <input type="hidden" name="id" value="${user.id}">
                    <div class="mb-3">
                        <label class="form-label">Email</label>
                        <input type="email" class="form-control" name="email" value="${user.email}" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Role</label>
                        <select class="form-select" name="role" required>
                            <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                            <option value="manager" ${user.role === 'manager' ? 'selected' : ''}>Manager</option>
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Department</label>
                        <input type="text" class="form-control" name="department" value="${user.department || ''}">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">New Password (leave blank to keep current)</label>
                        <input type="password" class="form-control" name="password">
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" onclick="updateUser('${user.id}')">Save Changes</button>
            </div>
        `;

        const modalElement = document.getElementById('assetModal');
        modalElement.querySelector('.modal-content').innerHTML = modalContent;
        
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    } catch (error) {
        console.error('Error showing edit form:', error);
        showError('Failed to load user details');
    }
}

// Update user
async function updateUser(userId) {
    if (!auth.hasRole('admin')) {
        showError('You do not have permission to update users');
        return;
    }

    const form = document.getElementById('editUserForm');
    const formData = new FormData(form);
    const userData = Object.fromEntries(formData.entries());

    // Remove password if empty
    if (!userData.password) {
        delete userData.password;
    }

    try {
        const response = await fetch(`/api/auth/users/${userId}`, {
            method: 'PUT',
            headers: auth.addAuthHeader({
                'Content-Type': 'application/json'
            }),
            body: JSON.stringify(userData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update user');
        }

        bootstrap.Modal.getInstance(document.getElementById('assetModal')).hide();
        showSuccess('User updated successfully');
        await loadUsers();
    } catch (error) {
        console.error('Error updating user:', error);
        showError(error.message);
    }
}

// Toggle user active status
async function toggleUserStatus(userId, newStatus) {
    if (!auth.hasRole('admin')) {
        showError('You do not have permission to modify user status');
        return;
    }

    try {
        const response = await fetch(`/api/auth/users/${userId}`, {
            method: 'PUT',
            headers: auth.addAuthHeader({
                'Content-Type': 'application/json'
            }),
            body: JSON.stringify({ is_active: newStatus })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update user status');
        }

        showSuccess(`User ${newStatus ? 'activated' : 'deactivated'} successfully`);
        await loadUsers();
    } catch (error) {
        console.error('Error updating user status:', error);
        showError(error.message);
    }
}

// Initialize user management
document.addEventListener('DOMContentLoaded', function() {
    const usersTab = document.querySelector('a[data-bs-target="#users"]');
    if (usersTab) {
        usersTab.addEventListener('shown.bs.tab', loadUsers);
    }
}); 