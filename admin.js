// admin.js
import { auth, db } from './firebaseConfig.js';
import { collection, getDocs, query, where, deleteDoc, doc } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';
import { deleteUser } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { createListingsTable } from './components.js';

const agentsTableBody = document.getElementById('agentsTable')?.querySelector('tbody');
const listingsTableBody = document.getElementById('listingsTable')?.querySelector('tbody');

// Fetch and display agents
async function displayAgents() {
    if (!agentsTableBody) return;
    
    try {
        const usersQuery = query(collection(db, 'users'), where('role', '==', 'agent'));
        const agentsSnapshot = await getDocs(usersQuery);
        
        agentsTableBody.innerHTML = ''; // Clear existing table
        
        for (const agentDoc of agentsSnapshot.docs) {
            const agentData = agentDoc.data();
            const row = agentsTableBody.insertRow();
            
            row.insertCell().textContent = agentDoc.id;
            row.insertCell().textContent = agentData.displayName || 'N/A';
            
            // Count listings for the agent
            const listingsQuery = query(collection(db, 'properties'), where('agent', '==', agentData.email));
            const listingsSnapshot = await getDocs(listingsQuery);
            row.insertCell().textContent = listingsSnapshot.size;
            
            // Delete button
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.classList.add('btn', 'btn-danger', 'btn-sm');
            deleteButton.addEventListener('click', () => deleteAgent(agentDoc.id));
            row.insertCell().appendChild(deleteButton);
        }
    } catch (error) {
        console.error('Error fetching agents:', error);
        alert('Error loading agents: ' + error.message);
    }
}

// Delete agent function
async function deleteAgent(agentId) {
    if (!confirm('Are you sure you want to delete this agent?')) return;
    
    try {
        // Delete user from Authentication
        const user = await auth.getUser(agentId);
        if (user) {
            await deleteUser(user);
        }
        
        // Delete user document from Firestore
        await deleteDoc(doc(db, 'users', agentId));
        
        alert('Agent deleted successfully.');
        displayAgents(); // Refresh the table
    } catch (error) {
        console.error('Error deleting agent:', error);
        alert('Error deleting agent: ' + error.message);
    }
}

// Display listings
async function displayListings() {
    const listingsContainer = document.getElementById('ilanlar');
    if (!listingsContainer) return;
    
    try {
        const listingsSnapshot = await getDocs(collection(db, 'properties'));
        const listings = listingsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        createListingsTable(listingsContainer, listings, {
            showAgent: true,
            onViewClick: (id) => window.location.href = `listing-details.html?id=${id}`
        });
    } catch (error) {
        console.error('Error fetching listings:', error);
        alert('Error loading listings: ' + error.message);
    }
}

// Initialize the admin dashboard
document.addEventListener('DOMContentLoaded', () => {
    displayAgents();
    displayListings();
});

// Export functions for use in HTML
window.deleteAgent = deleteAgent;