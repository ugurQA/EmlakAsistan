// components.js

/**
 * Creates a reusable listings table component
 * @param {HTMLElement} container - The container element to append the table to
 * @param {Array} listings - Array of listing objects
 * @param {Object} options - Configuration options
 * @param {boolean} options.showAgent - Whether to show the agent column (default: false)
 * @param {Function} options.onViewClick - Callback function when view button is clicked
 */
export function createListingsTable(container, listings, options = {}) {
    const { showAgent = false, onViewClick = (id) => window.location.href = `listing-details.html?id=${id}` } = options;
    
    // Clear container
    container.innerHTML = '';
    
    // Create table with Bootstrap classes
    const table = document.createElement('table');
    table.className = 'table table-striped table-hover';
    
    // Create header
    const thead = document.createElement('thead');
    thead.className = 'thead-light';
    const headerRow = document.createElement('tr');
    
    const columns = [
        { id: 'image', label: 'Resim', width: '80px' },
        { id: 'title', label: 'Başlık', width: '25%' },
        { id: 'type', label: 'Tür', width: '8%' },
        { id: 'category', label: 'Kategori', width: '8%' },
        { id: 'location', label: 'Yer', width: '12%' },
        { id: 'squareMeters', label: 'Metrekare', width: '8%' },
        { id: 'roomType', label: 'Oda Sayısı', width: '10%' },
        { id: 'price', label: 'Fiyat', width: '10%' },
        ...(showAgent ? [{ id: 'agent', label: 'Agent', width: '15%' }] : []),
        { id: 'actions', label: 'Actions', width: '100px' }
    ];
    
    columns.forEach(column => {
        const th = document.createElement('th');
        th.textContent = column.label;
        th.style.width = column.width;
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create body
    const tbody = document.createElement('tbody');
    listings.forEach(listing => {
        const tr = document.createElement('tr');
        
        // Image cell
        const tdImage = document.createElement('td');
        const img = document.createElement('img');
        img.style.width = '50px';
        img.style.height = '50px';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '4px';
        if (listing.photos && listing.photos.length > 0) {
            img.src = listing.photos[0];
        } else {
            img.src = '';
            img.alt = 'No image';
        }
        tdImage.appendChild(img);
        tr.appendChild(tdImage);
        
        // Title cell
        const tdTitle = document.createElement('td');
        tdTitle.textContent = listing.title || 'No title';
        tdTitle.style.textAlign = 'left';
        tr.appendChild(tdTitle);
        
        // Type cell
        const tdType = document.createElement('td');
        tdType.textContent = listing.type || '-';
        tr.appendChild(tdType);
        
        // Category cell
        const tdCategory = document.createElement('td');
        tdCategory.textContent = listing.category || '-';
        tr.appendChild(tdCategory);
        
        // Location cell
        const tdLocation = document.createElement('td');
        tdLocation.textContent = listing.province && listing.district ? 
            `${listing.province}/${listing.district}` : '-';
        tr.appendChild(tdLocation);
        
        // Square meters cell
        const tdSquareMeters = document.createElement('td');
        tdSquareMeters.textContent = listing.squareMeters ? 
            `${listing.squareMeters} m²` : '-';
        tr.appendChild(tdSquareMeters);
        
        // Room type cell
        const tdRoomType = document.createElement('td');
        tdRoomType.textContent = listing.category === 'Konut' ? 
            (listing.roomType || '-') : '-';
        tr.appendChild(tdRoomType);
        
        // Price cell
        const tdPrice = document.createElement('td');
        tdPrice.textContent = listing.price ? 
            `${listing.price.toLocaleString()} TL` : '-';
        tdPrice.style.color = '#dc3545'; // Bootstrap danger color
        tdPrice.style.fontWeight = 'bold';
        tr.appendChild(tdPrice);
        
        // Agent cell (optional)
        if (showAgent) {
            const tdAgent = document.createElement('td');
            tdAgent.textContent = listing.agent || '-';
            tr.appendChild(tdAgent);
        }
        
        // Actions cell
        const tdActions = document.createElement('td');
        const viewButton = document.createElement('button');
        viewButton.className = 'btn btn-primary btn-sm';
        viewButton.innerHTML = '<i class="fas fa-eye me-1"></i>Görüntüle';
        viewButton.onclick = () => onViewClick(listing.id);
        tdActions.appendChild(viewButton);
        tr.appendChild(tdActions);
        
        tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    container.appendChild(table);
}

// Keep other existing component functions
export function createRoomTypeDropdown() {
    const select = document.createElement('select');
    select.className = 'form-control';
    const options = [
        { value: '', text: 'Seçiniz' },
        { value: '1+0', text: '1+0' },
        { value: '1+1', text: '1+1' },
        { value: '2+1', text: '2+1' },
        { value: '3+1', text: '3+1' },
        { value: '4+1', text: '4+1' },
        { value: '5+1', text: '5+1' },
        { value: '6+1', text: '6+1' },
        { value: '7+', text: '7+ ve üzeri' }
    ];
    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.text;
        select.appendChild(option);
    });
    return select;
}

export function createHeatingDropdown() {
    const select = document.createElement('select');
    select.className = 'form-control';
    const options = [
        { value: '', text: 'Seçiniz' },
        { value: 'Merkezi', text: 'Merkezi Sistem' },
        { value: 'Doğalgaz-Kombi', text: 'Doğalgaz-Kombi' },
        { value: 'Isı Pompası', text: 'Isı Pompası' },
        { value: 'Klima', text: 'Klima' },
        { value: 'Soba', text: 'Soba' },
        { value: 'Yok', text: 'Isıtma Yok' }
    ];
    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.text;
        select.appendChild(option);
    });
    return select;
}

export function createParkingDropdown() {
    const select = document.createElement('select');
    select.className = 'form-control';
    const options = [
        { value: '', text: 'Seçiniz' },
        { value: 'Var-Açık', text: 'Var - Açık' },
        { value: 'Var-Kapalı', text: 'Var - Kapalı' },
        { value: 'Yok', text: 'Yok' }
    ];
    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.text;
        select.appendChild(option);
    });
    return select;
}

export function createSiteDropdown() {
    const select = document.createElement('select');
    select.className = 'form-control';
    const options = [
        { value: '', text: 'Seçiniz' },
        { value: 'Evet', text: 'Evet' },
        { value: 'Hayır', text: 'Hayır' }
    ];
    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.text;
        select.appendChild(option);
    });
    return select;
}

export function createDevelopmentStatusDropdown() {
    const select = document.createElement('select');
    select.className = 'form-control';
    const options = [
        { value: '', text: 'Seçiniz' },
        { value: 'Tarla', text: 'Tarla' },
        { value: 'Arsa', text: 'Arsa' }
    ];
    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.text = opt.text;
        select.appendChild(option);
    });
    return select;
}

export function createFloorDropdown() {
    const select = document.createElement('select');
    select.className = 'form-control';
    const options = [
        { value: '', text: 'Seçiniz' },
        { value: 'Bodrum', text: 'Bodrum' },
        { value: 'Zemin', text: 'Zemin' }
    ];
    
    // Add floors 1-30
    for (let i = 1; i <= 30; i++) {
        options.push({ value: i.toString(), text: i.toString() });
    }
    options.push({ value: '30+', text: '30 ve üzeri' });
    
    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.text;
        select.appendChild(option);
    });
    return select;
}

export function createTotalFloorsDropdown() {
    const select = document.createElement('select');
    select.className = 'form-control';
    const options = [
        { value: '', text: 'Seçiniz' }
    ];
    
    // Add floors 1-30
    for (let i = 1; i <= 30; i++) {
        options.push({ value: i.toString(), text: i.toString() });
    }
    options.push({ value: '30+', text: '30 ve üzeri' });
    
    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.text;
        select.appendChild(option);
    });
    return select;
}