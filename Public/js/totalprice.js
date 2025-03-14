document.addEventListener('DOMContentLoaded', initTotalPrice);
async function initTotalPrice() {
    // Check if user is authenticated and is admin
    if (typeof isAuthenticated === 'function' && !isAuthenticated()) {
        console.log('Not authenticated, redirecting to login page');
        window.location.href = '/login';
        return;
    }

    if (typeof isAdmin === 'function' && !isAdmin()) {
        console.log('Access denied: Admin privileges required');
        alert('You do not have permission to access this page. Admin privileges required.');
        window.location.href = '/index';
        return;
    }

    const startDateInput = document.getElementById('startDateInput');
    const endDateInput = document.getElementById('endDateInput');
    const fetchButton = document.getElementById('fetchButton');
    const selectedDateRangeElement = document.getElementById('selected-date-range');
    const contentElement = document.getElementById('content');
    const exportElement = document.getElementById('export');
    const saveButton = document.getElementById('save');

    const showElement = (element) => element.classList.remove('hidden');
    const hideElement = (element) => element.classList.add('hidden');

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-CA').split('T')[0];
    };

    const currentDate = new Date().toLocaleDateString('en-CA').split('T')[0];
    startDateInput.value = currentDate;
    endDateInput.value = currentDate;

    let selectedUnit = '';
    hideElement(contentElement);
    hideElement(exportElement);

    fetchButton.addEventListener('click', async () => {
        const startDate = new Date(startDateInput.value);
        const endDate = new Date(endDateInput.value);
        endDate.setHours(23, 59, 59, 999);

        try {
            const formattedStartDate = startDate.toLocaleDateString('en-CA');
            const formattedEndDate = endDate.toLocaleDateString('en-CA');

            // Use authenticatedFetch if available, otherwise use fetch with auth headers
            const fetchFunc = typeof authenticatedFetch === 'function' ? authenticatedFetch : fetch;
            const headers = typeof authHeader === 'function' ? authHeader() : {};

            const [materialResponse, priceResponse] = await Promise.all([
                fetchFunc(`/daily-reports/date-range?start=${formattedStartDate}&end=${formattedEndDate}`, {
                    headers: headers
                }),
                fetchFunc(`/material-submit`, {
                    headers: headers
                }),
            ]);

            if (!materialResponse.ok) throw new Error('Failed to fetch material data');
            if (!priceResponse.ok) throw new Error('Failed to fetch material prices');

            const materialData = await materialResponse.json();
            const priceData = await priceResponse.json();

            // Sort materialData and priceData alphabetically by materialName
            materialData.sort((a, b) => a.materialName.localeCompare(b.materialName));
            priceData.sort((a, b) => a.materialName.localeCompare(b.materialName));

            if (materialData.length === 0) {
                alert('No data found for the selected date range.');
                return;
            }

            const combinedData = materialData.map(material => {
                const priceItem = priceData.find(p => p.materialName === material.materialName);
                return {
                    ...material,
                    materialPrice: priceItem ? priceItem.materialPrice : 0,
                    laborPrice: priceItem ? priceItem.laborPrice : 0,
                    unit: material.unit
                };
            });

            displayTotalPrice(combinedData, formattedStartDate, formattedEndDate);
            showElement(contentElement);
            showElement(exportElement);
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('Failed to fetch data. Please try again.');
        }
    });

    const displayTotalPrice = (data, startDate, endDate) => {
        selectedDateRangeElement.textContent = `Data for: ${startDate} to ${endDate}`;
        const tableBody = document.getElementById('materialsTableBody');
        tableBody.innerHTML = '';

        let grandTotal = 0;
        let totalMaterialPrice = 0;
        let totalLaborPrice = 0;

        data.forEach(item => {
            const row = document.createElement('tr');
            
            // Calculate individual row totals
            const rowMaterialCost = item.quantity * item.materialPrice;
            const rowLaborCost = item.quantity * item.laborPrice;
            const rowTotalPrice = rowMaterialCost + rowLaborCost;
            
            // Add to running totals
            totalMaterialPrice += rowMaterialCost;
            totalLaborPrice += rowLaborCost;
            grandTotal += rowTotalPrice;

            row.innerHTML = `
                <td>${item.materialName}</td>
                <td>${item.quantity} ${item.unit}</td>
                <td>${item.materialPrice.toFixed(2)} €</td>
                <td>${item.laborPrice.toFixed(2)} €</td>
                <td>${rowTotalPrice.toFixed(2)} €</td>
            `;
            tableBody.appendChild(row);
        });

        // Create and add grand total row
        const totalRow = document.createElement('tr');
        totalRow.className = 'table-dark fw-bold'; // Keep this class to match CSS selectors
        totalRow.innerHTML = `
            <td>TOTAL</td>
            <td></td>
            <td>${totalMaterialPrice.toFixed(2)} €</td>
            <td>${totalLaborPrice.toFixed(2)} €</td>
            <td>${grandTotal.toFixed(2)} €</td>
        `;
        tableBody.appendChild(totalRow);
    };

    saveButton.addEventListener('click', async () => {
        if (startDateInput.value && endDateInput.value) {
            try {
                const startDate = startDateInput.value;
                const endDate = endDateInput.value;
                // Find the grand total from the table
                const tableBody = document.getElementById('materialsTableBody');
                const totalRow = tableBody.querySelector('.table-dark.fw-bold');
                let totalPrice = '0';
                
                if (totalRow) {
                    // Get the total from the last cell in the total row
                    const totalCell = totalRow.cells[totalRow.cells.length - 1];
                    totalPrice = totalCell.textContent.replace(' €', '');
                }
                
                // Use authenticatedFetch if available, otherwise use fetch with auth headers
                const fetchFunc = typeof authenticatedFetch === 'function' ? authenticatedFetch : fetch;
                const headers = {
                    'Content-Type': 'application/json',
                    ...(typeof authHeader === 'function' ? authHeader() : {})
                };
                
                const response = await fetchFunc('/total-price', {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        startDate,
                        endDate,
                        totalPrice: parseFloat(totalPrice)
                    })
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.message || 'Failed to save total price');
                }

                alert('Total price saved successfully!');
            } catch (error) {
                console.error('Error saving total price:', error);
                alert('Failed to save total price: ' + error.message);
            }
        } else {
            alert('Please select a date range first.');
        }
    });
}