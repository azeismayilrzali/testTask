async function login() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const response = await fetch('/api/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        if (!response.ok) throw new Error('Login failed');
        
        const user = await response.json();
        showItemsSection(user);
    } catch (error) {
        alert('Login failed');
    }
}

async function register() {
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;
    
    try {
        const response = await fetch('/api/users/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        if (!response.ok) throw new Error(response.statusText);
        
        const user = await response.json();
        showItemsSection(user);
    } catch (error) {
        console.log(error);
        alert('Registration failed');
    }
}

async function logout() {
    await fetch('/api/users/logout', { method: 'POST' });
    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('items-section').style.display = 'none';
}

async function loadSkinportItems() {
    const response = await fetch('/api/items/skinport');
    const items = await response.json();
    
    const itemsGrid = document.getElementById('skinport-items');
    itemsGrid.innerHTML = '';
    
    items.forEach(item => {
        const itemCard = document.createElement('div');
        itemCard.className = 'item-card';
        itemCard.innerHTML = `
            <h3>${item.market_hash_name}</h3>
            <p>Non-tradable Price: €${item.suggested_price}</p>
            ${item.tradable_min_price 
              ? `<p>Tradable Price: €${item.tradable_min_price}</p>`
              : '<p>No tradable version available</p>'
            }
            <p>Quantity: ${item.quantity}</p>
            <a href="${item.market_page}" target="_blank">
                <button ${item.quantity === 0 ? 'disabled' : ''}>${item.quantity === 0 ? 'Out of Stock' : 'View on SkinPort'}</button>
            </a>
        `;
        itemsGrid.appendChild(itemCard);
    });
}

async function loadCustomItems() {
    const response = await fetch('/api/items/custom');
    const items = await response.json();
    
    const itemsGrid = document.getElementById('custom-items');
    itemsGrid.innerHTML = '';
    
    items.forEach(item => {
        const itemCard = document.createElement('div');
        itemCard.className = 'item-card';
        itemCard.innerHTML = `
            <h3>${item.name}</h3>
            <p>Price: €${item.price}</p>
            <p>Quantity: ${item.quantity}</p>
            <button onclick="purchaseItem(${item.id})" ${item.quantity === 0 ? 'disabled' : ''}>
                ${item.quantity === 0 ? 'Out of Stock' : 'Purchase'}
            </button>
        `;
        itemsGrid.appendChild(itemCard);
    });
}

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[onclick="switchTab('${tab}')"]`).classList.add('active');
    
    if (tab === 'skinport') {
        document.getElementById('skinport-items').style.display = 'grid';
        document.getElementById('custom-items').style.display = 'none';
        loadSkinportItems();
    } else {
        document.getElementById('skinport-items').style.display = 'none';
        document.getElementById('custom-items').style.display = 'grid';
        loadCustomItems();
    }
}

function showItemsSection(user) {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('items-section').style.display = 'block';
    document.getElementById('username-display').textContent = `Welcome, ${user.username}`;
    document.getElementById('balance-display').textContent = `Balance: €${user.balance.toFixed(2)}`;
    loadSkinportItems();
    loadCustomItems();
}

async function purchaseItem(itemId) {
    try {
        const response = await fetch(`/api/items/purchase/${itemId}`, {
            method: 'POST'
        });

        if (!response.ok) throw new Error('Purchase failed');
        
        const result = await response.json();
        document.getElementById('balance-display').textContent = 
            `Balance: €${result.newBalance.toFixed(2)}`;
        loadCustomItems();
    } catch (error) {
        alert('Purchase failed');
    }
}
