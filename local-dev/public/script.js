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

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Show loading overlay
    showLoading();
    
    // Initialize navigation
    initNavigation();
    
    // Set current year in footer
    document.getElementById('currentYear').textContent = new Date().getFullYear();
    
    // Load dropdown options
    loadDropdownOptions()
        .then(() => {
            // Load dashboard data
            return loadDashboardData();
        })
        .then(() => {
            // Hide loading overlay
            hideLoading();
        })
        .catch(error => {
            console.error('Error initializing app:', error);
            hideLoading();
            showNotification('Error loading application data. Please refresh the page.', 'error');
        });
    
    // Initialize form submission
    document.getElementById('assetForm').addEventListener('submit', handleFormSubmit);
    
    // Initialize notification close button
    document.querySelector('.close-notification').addEventListener('click', function() {
        document.getElementById('notification').style.display = 'none';
    });

    // Add real-time validation
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('input', debounce(function(e) {
            validateField(e.target);
        }, 300));
    });

    // Add placeholder text
    document.getElementById('ram').placeholder = 'e.g., 16GB, 32GB, 64GB';
    document.getElementById('storage').placeholder = 'e.g., 512GB, 1TB';

    initializeSearch();
});

// Initialize navigation
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all links and sections
            navLinks.forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Show corresponding section
            const sectionId = this.getAttribute('data-section');
            document.getElementById(sectionId).classList.add('active');
            
            // If dashboard is selected, refresh the data
            if (sectionId === 'dashboard') {
                loadDashboardData();
            }
        });
    });
}

// Load dropdown options
async function loadDropdownOptions() {
    try {
        const response = await fetch(`${API_BASE_URL}/dropdowns`);
        if (!response.ok) throw new Error('Failed to fetch dropdown options');
        
        const options = await response.json();
        
        // Populate dropdowns
        populateSelect('assetType', options.assetTypes);
        populateSelect('operatingSystem', options.operatingSystems);
        populateSelect('location', options.locations);
        populateSelect('status', options.statuses);
        populateSelect('condition', options.conditions);
    } catch (error) {
        console.error('Error loading dropdown options:', error);
        throw error;
    }
}

// Populate select element
function populateSelect(elementId, options) {
    const select = document.getElementById(elementId);
    const currentValue = select.value;
    
    // Clear existing options except the first one
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    // Add new options
    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        select.appendChild(optionElement);
    });
    
    // Restore previous value if it exists in new options
    if (options.includes(currentValue)) {
        select.value = currentValue;
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        const response = await fetch(`${API_BASE_URL}/dashboard`);
        if (!response.ok) throw new Error('Failed to fetch dashboard data');
        
        const metrics = await response.json();
        
        // Update total assets
        document.getElementById('totalAssets').textContent = metrics.totalAssets;
        
        // Update summary cards
        document.getElementById('availableAssets').textContent = 
            metrics.assetsByStatus['Available'] || 0;
        document.getElementById('assignedAssets').textContent = 
            metrics.assetsByStatus['Assigned'] || 0;
        document.getElementById('maintenanceAssets').textContent = 
            (metrics.assetsByStatus['In-Repair'] || 0);
        
        // Create or update charts
        createOrUpdateChart('assetsByTypeChart', 'doughnut', 'Assets by Type', metrics.assetsByType);
        createOrUpdateChart('assetsByStatusChart', 'doughnut', 'Assets by Status', metrics.assetsByStatus);
        createOrUpdateChart('assetsByOSChart', 'doughnut', 'Assets by OS', metrics.assetsByOS);
        createOrUpdateChart('assetsByLocationChart', 'doughnut', 'Assets by Location', metrics.assetsByLocation);
        
        chartsInitialized = true;
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        throw error;
    }
}

// Create or update chart
function createOrUpdateChart(canvasId, type, label, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error(`Canvas with ID ${canvasId} not found`);
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Prepare data for Chart.js
    const labels = Object.keys(data);
    const values = Object.values(data);
    
    // If no data, show a message
    if (labels.length === 0) {
        if (charts[canvasId]) {
            charts[canvasId].destroy();
            delete charts[canvasId];
        }
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '14px Arial';
        ctx.fillStyle = '#7f8c8d';
        ctx.textAlign = 'center';
        ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    // Generate colors
    const colors = generateColors(labels.length);
    
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    boxWidth: 12,
                    font: { size: 11 },
                    generateLabels: function(chart) {
                        const data = chart.data;
                        if (data.labels.length && data.datasets.length) {
                            return data.labels.map((label, i) => ({
                                text: `${label} (${data.datasets[0].data[i]})`,
                                fillStyle: data.datasets[0].backgroundColor[i],
                                hidden: isNaN(data.datasets[0].data[i]) || chart.getDatasetMeta(0).data[i].hidden,
                                lineCap: 'butt',
                                lineDash: [],
                                lineDashOffset: 0,
                                lineJoin: 'miter',
                                lineWidth: 1,
                                strokeStyle: data.datasets[0].backgroundColor[i],
                                index: i
                            }));
                        }
                        return [];
                    }
                },
                onClick: function(e, legendItem, legend) {
                    const index = legendItem.index;
                    const chart = legend.chart;
                    const meta = chart.getDatasetMeta(0);
                    
                    // Toggle the hidden state of the clicked item
                    meta.data[index].hidden = !meta.data[index].hidden;
                    
                    // Update the chart
                    chart.update();
                }
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return `${context.label}: ${context.raw}`;
                    }
                }
            }
        }
    };
    
    // Create or update chart
    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }
    
    charts[canvasId] = new Chart(ctx, {
        type: 'doughnut', // Set default type to doughnut
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: values,
                backgroundColor: colors,
                borderWidth: 1
            }]
        },
        options: chartOptions
    });
}

// Generate random colors for charts
function generateColors(count) {
    const colors = [
        '#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6',
        '#1abc9c', '#d35400', '#34495e', '#16a085', '#c0392b',
        '#27ae60', '#2980b9', '#8e44ad', '#f1c40f', '#e67e22'
    ];
    
    // If we need more colors than in our predefined list, generate random ones
    if (count > colors.length) {
        for (let i = colors.length; i < count; i++) {
            const r = Math.floor(Math.random() * 200);
            const g = Math.floor(Math.random() * 200);
            const b = Math.floor(Math.random() * 200);
            colors.push(`rgb(${r}, ${g}, ${b})`);
        }
    }
    
    return colors.slice(0, count);
}

// Add this function after the existing functions
function validateFormData(formData) {
    const errors = [];
    
    // Required fields validation
    const requiredFields = [
        { field: 'Asset Type', label: 'Asset Type' },
        { field: 'Make', label: 'Make' },
        { field: 'Model', label: 'Model' },
        { field: 'Serial Number', label: 'Serial Number' },
        { field: 'Operating System', label: 'Operating System' },
        { field: 'Location', label: 'Location' },
        { field: 'Status', label: 'Status' },
        { field: 'Assignee', label: 'Assignee' }
    ];

    requiredFields.forEach(({ field, label }) => {
        if (!formData[field] || formData[field].trim() === '') {
            errors.push(`${label} is required`);
        }
    });

    // Format validations
    if (formData['Serial Number'] && !VALIDATION_RULES.serialNumber.pattern.test(formData['Serial Number'])) {
        errors.push(VALIDATION_RULES.serialNumber.message);
    }

    if (formData['Assignee'] && !VALIDATION_RULES.email.pattern.test(formData['Assignee'])) {
        errors.push(VALIDATION_RULES.email.message);
    }

    if (formData['RAM'] && !VALIDATION_RULES.ram.pattern.test(formData['RAM'])) {
        errors.push(VALIDATION_RULES.ram.message);
    }

    if (formData['Storage'] && !VALIDATION_RULES.storage.pattern.test(formData['Storage'])) {
        errors.push(VALIDATION_RULES.storage.message);
    }

    // Length validations
    Object.entries(VALIDATION_RULES.maxLengths).forEach(([field, maxLength]) => {
        const value = formData[field.charAt(0).toUpperCase() + field.slice(1)];
        if (value && value.length > maxLength) {
            errors.push(`${field} must not exceed ${maxLength} characters`);
        }
    });

    return errors;
}

// Modify the handleFormSubmit function to include validation
async function handleFormSubmit(e) {
    e.preventDefault();
    
    // Get form data
    const formData = {
        'Asset Type': document.getElementById('assetType').value,
        'Make': document.getElementById('make').value,
        'Model': document.getElementById('model').value,
        'Serial Number': document.getElementById('serialNumber').value,
        'Operating System': document.getElementById('operatingSystem').value,
        'Processor': document.getElementById('processor').value,
        'RAM': document.getElementById('ram').value,
        'Storage': document.getElementById('storage').value,
        'Location': document.getElementById('location').value,
        'Status': document.getElementById('status').value,
        'Assignee': document.getElementById('assignee').value,
        'Condition': document.getElementById('condition').value,
        'Notes': document.getElementById('notes').value
    };

    // Validate form data
    const validationErrors = validateFormData(formData);
    if (validationErrors.length > 0) {
        showNotification(validationErrors.join('\n'), 'error');
        return;
    }

    // Show loading overlay
    showLoading();
    
    try {
        // Submit form data
        const response = await fetch(`${API_BASE_URL}/assets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) throw new Error('Failed to register asset');
        
        const result = await response.json();
        
        // Hide loading overlay
        hideLoading();
        
        // Show success notification
        showNotification(`Asset registered successfully with ID: ${result.assetID}`);
        
        // Reset form
        document.getElementById('assetForm').reset();
        
        // Refresh dashboard data
        loadDashboardData();
    } catch (error) {
        console.error('Error registering asset:', error);
        hideLoading();
        showNotification('Error registering asset. Please try again.', 'error');
    }
}

// Show loading overlay
function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

// Hide loading overlay
function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notificationMessage');
    
    // Set message
    notificationMessage.textContent = message;
    
    // Set notification type
    notification.className = 'notification';
    notification.classList.add(`notification-${type}`);
    
    // Show notification
    notification.style.display = 'block';
    
    // Hide notification after 5 seconds
    setTimeout(() => {
        notification.style.display = 'none';
    }, 5000);
}

// Add these helper functions
function validateField(field) {
    const value = field.value;
    let error = '';

    // Clear existing error styling
    field.classList.remove('error');
    const existingError = field.parentElement.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }

    // Required field validation
    if (field.hasAttribute('required') && !value.trim()) {
        error = 'This field is required';
    }
    // Email validation
    else if (field.type === 'email' && value) {
        if (!VALIDATION_RULES.email.pattern.test(value)) {
            error = VALIDATION_RULES.email.message;
        }
    }
    // Serial number validation
    else if (field.id === 'serialNumber' && value) {
        if (!VALIDATION_RULES.serialNumber.pattern.test(value)) {
            error = VALIDATION_RULES.serialNumber.message;
        }
    }
    // RAM format validation
    else if (field.id === 'ram' && value) {
        if (!VALIDATION_RULES.ram.pattern.test(value)) {
            error = VALIDATION_RULES.ram.message;
        }
    }
    // Storage format validation
    else if (field.id === 'storage' && value) {
        if (!VALIDATION_RULES.storage.pattern.test(value)) {
            error = VALIDATION_RULES.storage.message;
        }
    }
    // Length validations for all fields with maxLength restrictions
    if (VALIDATION_RULES.maxLengths[field.id] && value.length > VALIDATION_RULES.maxLengths[field.id]) {
        error = `Maximum ${VALIDATION_RULES.maxLengths[field.id]} characters allowed`;
    }

    // Show error if any
    if (error) {
        field.classList.add('error');
        const errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        errorElement.textContent = error;
        field.parentElement.appendChild(errorElement);
        return false;
    }
    return true;
}

// Add these functions after your existing code
function filterDataByPeriod(data, period) {
    const now = new Date();
    const filteredData = {};
    
    // If period is 'all', return original data
    if (period === 'all') {
        return data;
    }
    
    // Calculate the cutoff date based on the selected period
    let cutoffDate = new Date();
    switch (period) {
        case 'week':
            cutoffDate.setDate(now.getDate() - 7);
            break;
        case 'month':
            cutoffDate.setMonth(now.getMonth() - 1);
            break;
        case 'year':
            cutoffDate.setFullYear(now.getFullYear() - 1);
            break;
        default:
            return data;
    }
    
    return data; // For now, return all data as we'll implement filtering in the backend
}

// Update the loadDashboardMetrics function
async function loadDashboardMetrics() {
    try {
        const period = document.getElementById('chartPeriod').value;
        const chartType = document.getElementById('chartType').value;
        
        const response = await fetch(`${API_BASE_URL}/dashboard?period=${period}`);
        if (!response.ok) throw new Error('Failed to fetch dashboard data');
        
        const metrics = await response.json();
        
        // Update total assets
        document.getElementById('totalAssets').textContent = metrics.totalAssets;
        
        // Update summary cards
        document.getElementById('availableAssets').textContent = 
            metrics.assetsByStatus['Available'] || 0;
        document.getElementById('assignedAssets').textContent = 
            metrics.assetsByStatus['Assigned'] || 0;
        document.getElementById('maintenanceAssets').textContent = 
            (metrics.assetsByStatus['In-Repair'] || 0);
        
        // Create or update charts with the selected chart type
        createOrUpdateChart('assetsByTypeChart', chartType, 'Assets by Type', metrics.assetsByType);
        createOrUpdateChart('assetsByStatusChart', chartType, 'Assets by Status', metrics.assetsByStatus);
        createOrUpdateChart('assetsByOSChart', chartType, 'Assets by OS', metrics.assetsByOS);
        createOrUpdateChart('assetsByLocationChart', chartType, 'Assets by Location', metrics.assetsByLocation);
        
        chartsInitialized = true;
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        throw error;
    }
}

// Initialize search functionality
function initializeSearch() {
    const searchButton = document.getElementById('searchButton');
    const searchField = document.getElementById('searchField');
    const searchValue = document.getElementById('searchValue');
    const modal = document.getElementById('assetModal');
    const closeModal = document.getElementsByClassName('close')[0];
    
    // Search button click handler
    searchButton.addEventListener('click', performSearch);
    
    // Enter key handler for search input
    searchValue.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    // Modal close button
    if (closeModal) {
        closeModal.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    }
    
    // Click outside modal to close
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Perform search
async function performSearch() {
    const searchField = document.getElementById('searchField').value;
    const searchValue = document.getElementById('searchValue').value.trim();
    const resultsTable = document.getElementById('resultsTable');
    const noResults = document.getElementById('noResults');
    
    if (!searchField || !searchValue) {
        showNotification('Please select a search field and enter a search value', 'error');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE_URL}/search?field=${encodeURIComponent(searchField)}&value=${encodeURIComponent(searchValue)}`);
        if (!response.ok) throw new Error('Search failed');
        
        const results = await response.json();
        displaySearchResults(results);
    } catch (error) {
        console.error('Search error:', error);
        showNotification('Error performing search. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

// Display search results
function displaySearchResults(results) {
    const resultsTable = document.getElementById('resultsTable');
    const noResults = document.getElementById('noResults');
    const searchResults = document.getElementById('searchResults');
    
    // Clear previous results
    searchResults.innerHTML = '';
    
    if (results.length === 0) {
        resultsTable.classList.add('hidden');
        noResults.classList.remove('hidden');
        return;
    }
    
    // Show results table and hide no results message
    resultsTable.classList.remove('hidden');
    noResults.classList.add('hidden');
    
    // Populate results
    results.forEach(asset => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${asset['Asset ID']}</td>
            <td>${asset['Asset Type']}</td>
            <td>${asset['Make']}</td>
            <td>${asset['Model']}</td>
            <td>${asset['Serial Number']}</td>
            <td>${asset['Status']}</td>
            <td>${asset['Location']}</td>
            <td>${asset['Assignee']}</td>
            <td><span class="view-details" onclick="showAssetDetails('${asset['Asset ID']}')">View Details</span></td>
        `;
        searchResults.appendChild(row);
    });
}

// Show asset details in modal
async function showAssetDetails(assetId) {
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE_URL}/assets/${encodeURIComponent(assetId)}`);
        if (!response.ok) throw new Error('Failed to fetch asset details');
        
        const asset = await response.json();
        const assetDetails = document.getElementById('assetDetails');
        
        // Create details HTML
        const detailsHTML = Object.entries(asset)
            .map(([key, value]) => `
                <div class="detail-item">
                    <div class="detail-label">${key}</div>
                    <div class="detail-value">${value || '-'}</div>
                </div>
            `)
            .join('');
        
        assetDetails.innerHTML = detailsHTML;
        document.getElementById('assetModal').style.display = 'block';
    } catch (error) {
        console.error('Error fetching asset details:', error);
        showNotification('Error fetching asset details. Please try again.', 'error');
    } finally {
        hideLoading();
    }
} 