// Global variables
const API_BASE_URL = 'http://localhost:3000/api';
let charts = {};
let chartsInitialized = false;

// Add after global variables
const VALIDATION_RULES = {
    serialNumber: {
        pattern: /^[A-Za-z0-9-]+$/,
        message: 'Serial number should only contain letters, numbers, and hyphens'
    },
    email: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: 'Please enter a valid email address'
    },
    maxLengths: {
        make: 50,
        model: 50,
        serialNumber: 50,
        processor: 100,
        ram: 20,
        storage: 30,
        notes: 500,
        assignee: 100
    },
    ram: {
        pattern: /^[0-9]{1,3}(GB|MB|TB)$/i,
        message: 'RAM should be in format: number followed by GB, MB, or TB (e.g., 16GB)'
    },
    storage: {
        pattern: /^[0-9]{1,4}(GB|TB)$/i,
        message: 'Storage should be in format: number followed by GB or TB (e.g., 512GB)'
    }
};

// Add this function near the top of your script.js file, after the global variables
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Check authentication status
document.addEventListener('DOMContentLoaded', function() {
    if (!auth.isLoggedIn()) {
        window.location.href = '/login.html';
        return;
    }

    // Initialize the application
    initializeApp();
});

// Initialize application
async function initializeApp() {
    try {
        // Load user profile
        const user = await auth.getCurrentUser();
        updateUserInfo(user);

        // Load initial data
        await loadDashboard();
        await loadDropdowns();

        // Set up event listeners
        setupEventListeners();
    } catch (error) {
        console.error('Error initializing app:', error);
        showError('Failed to initialize application');
    }
}

// Update user info in the UI
function updateUserInfo(user) {
    const userInfoElement = document.getElementById('userInfo');
    if (userInfoElement) {
        userInfoElement.innerHTML = `
            <span class="me-2">${user.username}</span>
            <span class="badge bg-secondary">${user.role}</span>
        `;
    }

    // Show/hide admin features based on user role
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(element => {
        element.style.display = auth.hasRole('admin') ? '' : 'none';
    });
}

// Load dashboard data
async function loadDashboard() {
    try {
        const response = await fetch('/api/dashboard', {
            headers: auth.addAuthHeader()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch dashboard data');
        }

        const { data } = await response.json();
        updateDashboard(data);
    } catch (error) {
        console.error('Dashboard error:', error);
        showError('Failed to load dashboard data');
    }
}

// Load dropdown options
async function loadDropdowns() {
    try {
        const response = await fetch('/api/dropdowns', {
            headers: auth.addAuthHeader()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch dropdown options');
        }

        const data = await response.json();
        populateDropdowns(data);
    } catch (error) {
        console.error('Dropdowns error:', error);
        showError('Failed to load form options');
    }
}

// Handle form submission
async function handleFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const assetData = Object.fromEntries(formData.entries());

    try {
        const response = await fetch('/api/assets', {
            method: 'POST',
            headers: auth.addAuthHeader({
                'Content-Type': 'application/json'
            }),
            body: JSON.stringify(assetData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to register asset');
        }

        showSuccess('Asset registered successfully');
        form.reset();
        await loadDashboard(); // Refresh dashboard data
    } catch (error) {
        console.error('Form submission error:', error);
        showError(error.message);
    }
}

// Search assets
async function searchAssets(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const searchParams = new URLSearchParams();
    
    formData.forEach((value, key) => {
        if (value) searchParams.append(key, value);
    });

    try {
        const response = await fetch(`/api/search?${searchParams}`, {
            headers: auth.addAuthHeader()
        });

        if (!response.ok) {
            throw new Error('Failed to search assets');
        }

        const { data } = await response.json();
        displaySearchResults(data);
    } catch (error) {
        console.error('Search error:', error);
        showError('Failed to search assets');
    }
}

// Display search results
function displaySearchResults(results) {
    const resultsContainer = document.getElementById('searchResults');
    if (!results || results.length === 0) {
        resultsContainer.innerHTML = '<p class="text-center">No assets found</p>';
        return;
    }

    const tableRows = results.map(asset => `
        <tr>
            <td>${asset.asset_id}</td>
            <td>${asset.asset_type}</td>
            <td>${asset.make} ${asset.model}</td>
            <td>${asset.location}</td>
            <td>${asset.status}</td>
            <td>
                <button class="btn btn-sm btn-info view-details" data-asset-id="${asset.asset_id}">
                    View Details
                </button>
                ${auth.hasRole('manager') ? `
                    <button class="btn btn-sm btn-warning edit-asset" data-asset-id="${asset.asset_id}">
                        Edit
                    </button>
                ` : ''}
                ${auth.hasRole('admin') ? `
                    <button class="btn btn-sm btn-danger delete-asset" data-asset-id="${asset.asset_id}">
                        Delete
                    </button>
                ` : ''}
            </td>
        </tr>
    `).join('');

    resultsContainer.innerHTML = `
        <table class="table table-striped">
            <thead>
                <tr>
                    <th>Asset ID</th>
                    <th>Type</th>
                    <th>Make/Model</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
    `;

    // Add event listeners for action buttons
    resultsContainer.querySelectorAll('.view-details').forEach(button => {
        button.addEventListener('click', () => showAssetDetails(button.dataset.assetId));
    });

    if (auth.hasRole('manager')) {
        resultsContainer.querySelectorAll('.edit-asset').forEach(button => {
            button.addEventListener('click', () => showEditAssetForm(button.dataset.assetId));
        });
    }

    if (auth.hasRole('admin')) {
        resultsContainer.querySelectorAll('.delete-asset').forEach(button => {
            button.addEventListener('click', () => confirmDeleteAsset(button.dataset.assetId));
        });
    }
}

// Show asset details
async function showAssetDetails(assetId) {
    try {
        const response = await fetch(`/api/assets/${assetId}`, {
            headers: auth.addAuthHeader()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch asset details');
        }

        const { data: asset } = await response.json();
        
        const modalContent = `
            <div class="modal-header">
                <h5 class="modal-title">Asset Details - ${asset.asset_id}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>Asset Type:</strong> ${asset.asset_type}</p>
                        <p><strong>Make:</strong> ${asset.make}</p>
                        <p><strong>Model:</strong> ${asset.model}</p>
                        <p><strong>Serial Number:</strong> ${asset.serial_number}</p>
                        <p><strong>Status:</strong> ${asset.status}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Location:</strong> ${asset.location}</p>
                        <p><strong>Assignee:</strong> ${asset.assignee || '-'}</p>
                        <p><strong>Condition:</strong> ${asset.condition}</p>
                        <p><strong>Registration Date:</strong> ${asset.registration_date ? new Date(asset.registration_date).toLocaleDateString() : '-'}</p>
                    </div>
                </div>
                ${asset.notes ? `
                    <div class="mt-3">
                        <strong>Notes:</strong>
                        <p class="mt-2">${asset.notes}</p>
                    </div>
                ` : ''}
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
        `;

        const modalElement = document.getElementById('assetModal');
        modalElement.querySelector('.modal-content').innerHTML = modalContent;
        
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    } catch (error) {
        console.error('Error fetching asset details:', error);
        showError('Failed to fetch asset details');
    }
}

// Show edit asset form
async function showEditAssetForm(assetId) {
    if (!auth.hasRole('manager')) {
        showError('You do not have permission to edit assets');
        return;
    }

    try {
        const [assetResponse, dropdownsResponse] = await Promise.all([
            fetch(`/api/assets/${assetId}`, {
                headers: auth.addAuthHeader()
            }),
            fetch('/api/dropdowns', {
                headers: auth.addAuthHeader()
            })
        ]);

        if (!assetResponse.ok || !dropdownsResponse.ok) {
            throw new Error('Failed to fetch required data');
        }

        const { data: asset } = await assetResponse.json();
        const dropdowns = await dropdownsResponse.json();

        const modalContent = `
            <div class="modal-header">
                <h5 class="modal-title">Edit Asset - ${asset.asset_id}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form id="editAssetForm">
                    <input type="hidden" name="asset_id" value="${asset.asset_id}">
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label">Asset Type</label>
                            <select class="form-select" name="asset_type" required>
                                ${dropdowns.assetTypes.map(type => 
                                    `<option value="${type}" ${asset.asset_type === type ? 'selected' : ''}>${type}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label">Status</label>
                            <select class="form-select" name="status" required>
                                ${dropdowns.statuses.map(status => 
                                    `<option value="${status}" ${asset.status === status ? 'selected' : ''}>${status}</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label">Make</label>
                            <input type="text" class="form-control" name="make" value="${asset.make || ''}" required>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label">Model</label>
                            <input type="text" class="form-control" name="model" value="${asset.model || ''}" required>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label">Serial Number</label>
                            <input type="text" class="form-control" name="serial_number" value="${asset.serial_number || ''}" required>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label">Location</label>
                            <select class="form-select" name="location" required>
                                ${dropdowns.locations.map(location => 
                                    `<option value="${location}" ${asset.location === location ? 'selected' : ''}>${location}</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label">Assignee</label>
                            <input type="text" class="form-control" name="assignee" value="${asset.assignee || ''}">
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label">Condition</label>
                            <select class="form-select" name="condition" required>
                                ${dropdowns.conditions.map(condition => 
                                    `<option value="${condition}" ${asset.condition === condition ? 'selected' : ''}>${condition}</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Notes</label>
                        <textarea class="form-control" name="notes" rows="3">${asset.notes || ''}</textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" onclick="updateAsset('${asset.asset_id}')">Save Changes</button>
            </div>
        `;

        const modalElement = document.getElementById('assetModal');
        modalElement.querySelector('.modal-content').innerHTML = modalContent;
        
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    } catch (error) {
        console.error('Error showing edit form:', error);
        showError('Failed to load edit form');
    }
}

// Update asset
async function updateAsset(assetId) {
    if (!auth.hasRole('manager')) {
        showError('You do not have permission to update assets');
        return;
    }

    const form = document.getElementById('editAssetForm');
    const formData = new FormData(form);
    const assetData = Object.fromEntries(formData.entries());

    try {
        const response = await fetch(`/api/assets/${assetId}`, {
            method: 'PUT',
            headers: auth.addAuthHeader({
                'Content-Type': 'application/json'
            }),
            body: JSON.stringify(assetData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update asset');
        }

        // Close modal and refresh data
        bootstrap.Modal.getInstance(document.getElementById('assetModal')).hide();
        showSuccess('Asset updated successfully');
        
        // Refresh search results if they're visible
        const searchForm = document.getElementById('searchForm');
        if (searchForm) {
            searchForm.dispatchEvent(new Event('submit'));
        }
        
        // Refresh dashboard
        await loadDashboard();
    } catch (error) {
        console.error('Update error:', error);
        showError(error.message);
    }
}

// Confirm asset deletion
function confirmDeleteAsset(assetId) {
    if (!auth.hasRole('admin')) {
        showError('You do not have permission to delete assets');
        return;
    }

    const modalContent = `
        <div class="modal-header">
            <h5 class="modal-title">Confirm Deletion</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
            <p>Are you sure you want to delete asset ${assetId}? This action cannot be undone.</p>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-danger" onclick="deleteAsset('${assetId}')">Delete Asset</button>
        </div>
    `;

    const modalElement = document.getElementById('assetModal');
    modalElement.querySelector('.modal-content').innerHTML = modalContent;
    
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
}

// Delete asset
async function deleteAsset(assetId) {
    if (!auth.hasRole('admin')) {
        showError('You do not have permission to delete assets');
        return;
    }

    try {
        const response = await fetch(`/api/assets/${assetId}`, {
            method: 'DELETE',
            headers: auth.addAuthHeader()
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete asset');
        }

        // Close modal and refresh data
        bootstrap.Modal.getInstance(document.getElementById('assetModal')).hide();
        showSuccess('Asset deleted successfully');
        
        // Refresh search results if they're visible
        const searchForm = document.getElementById('searchForm');
        if (searchForm) {
            searchForm.dispatchEvent(new Event('submit'));
        }
        
        // Refresh dashboard
        await loadDashboard();
    } catch (error) {
        console.error('Delete error:', error);
        showError(error.message);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Setup logout button
    document.getElementById('logoutButton').addEventListener('click', auth.logout);

    // Setup form submissions
    document.getElementById('registerForm')?.addEventListener('submit', handleFormSubmit);
    document.getElementById('searchForm')?.addEventListener('submit', searchAssets);

    // Initialize Bootstrap tabs
    const tabElements = document.querySelectorAll('[data-bs-toggle="tab"]');
    tabElements.forEach(tabEl => {
        tabEl.addEventListener('click', function(e) {
            e.preventDefault();
            bootstrap.Tab.getOrCreateInstance(this).show();
        });
    });
}

// Show success message
function showSuccess(message) {
    const alertElement = document.createElement('div');
    alertElement.className = 'alert alert-success alert-dismissible fade show';
    alertElement.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.querySelector('.container').insertBefore(alertElement, document.querySelector('.container').firstChild);
}

// Show error message
function showError(message) {
    const alertElement = document.createElement('div');
    alertElement.className = 'alert alert-danger alert-dismissible fade show';
    alertElement.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.querySelector('.container').insertBefore(alertElement, document.querySelector('.container').firstChild);
}

// Update dashboard
function updateDashboard(data) {
    // Update summary boxes
    const statusMappings = {
        'Available': 'availableCount',
        'In Use': 'assignedCount',
        'Under Maintenance': 'inRepairCount',
        'Retired': 'retiredCount'
    };

    Object.entries(data.statusCounts).forEach(([status, count]) => {
        const elementId = statusMappings[status];
        if (elementId) {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = count || '0';
            }
        }
    });

    // Update charts
    updateCharts(data);
}

// Update charts
function updateCharts(data) {
    // Destroy existing charts
    Object.values(charts).forEach(chart => {
        if (chart) {
            chart.destroy();
        }
    });

    // Asset Status Distribution
    const statusCtx = document.getElementById('statusChart')?.getContext('2d');
    if (statusCtx) {
        charts.statusChart = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(data.assetsByStatus || {}),
                datasets: [{
                    data: Object.values(data.assetsByStatus || {}),
                    backgroundColor: [
                        '#28a745', // Available - Green
                        '#17a2b8', // In Use - Blue
                        '#ffc107', // Under Maintenance - Yellow
                        '#dc3545'  // Retired - Red
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // Asset Type Distribution
    const typeCtx = document.getElementById('typeChart')?.getContext('2d');
    if (typeCtx) {
        charts.typeChart = new Chart(typeCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(data.assetsByType || {}),
                datasets: [{
                    label: 'Number of Assets',
                    data: Object.values(data.assetsByType || {}),
                    backgroundColor: '#007bff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
}

// Populate dropdowns
function populateDropdowns(data) {
    const dropdowns = {
        'assetType': data.assetTypes,
        'operatingSystem': data.operatingSystems,
        'location': data.locations,
        'status': data.statuses,
        'condition': data.conditions
    };

    Object.entries(dropdowns).forEach(([id, options]) => {
        const select = document.getElementById(id);
        if (select) {
            select.innerHTML = `
                <option value="">Select ${id.replace(/([A-Z])/g, ' $1').toLowerCase()}</option>
                ${options.map(option => `<option value="${option}">${option}</option>`).join('')}
            `;
        }
    });
} 