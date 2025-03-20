// admin.js

// Import the createListingTable function (if you're using modules)
// If you are not using modules, then do not add the import keyword.
//import { createListingTable } from './components.js';

const agentsTableBody = document.getElementById('agentsTable').querySelector('tbody');
const listingsTableBody = document.getElementById('listingsTable').querySelector('tbody');

// Fetch and display agents
function displayAgents() {
    const agentsRef = firebase.database().ref('users');
    agentsRef.on('value', (snapshot) => {
        agentsTableBody.innerHTML = ''; // Clear existing table
        snapshot.forEach((agentSnapshot) => {
            const agentId = agentSnapshot.key;
            const agentData = agentSnapshot.val();
            if (agentData.role === 'agent') {
                const row = agentsTableBody.insertRow();
                row.insertCell().textContent = agentId;
                row.insertCell().textContent = agentData.displayName;

                // Count listings for the agent
                const listingsRef = firebase.database().ref('listings');
                listingsRef.orderByChild('agentId').equalTo(agentId).once('value', (listingsSnapshot) => {
                    row.insertCell().textContent = listingsSnapshot.size;
                });

                // Delete button
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Delete';
                deleteButton.classList.add('btn', 'btn-danger', 'btn-sm');
                deleteButton.addEventListener('click', () => deleteAgent(agentId));
                row.insertCell().appendChild(deleteButton);
            }
        });
    });
}

// Delete agent function
function deleteAgent(agentId) {
    if (confirm('Are you sure you want to delete this agent?')) {
        firebase.database().ref(`users/${agentId}`).remove()
            .then(() => {
                alert('Agent deleted successfully.');
            })
            .catch((error) => {
                console.error('Error deleting agent:', error);
                alert('Error deleting agent.');
            });
    }
}

// Fetch and display listings (reusing logic from agent dashboard)
function displayListings() {
    createListingTable(listingsTableBody);
}

// Initialize
displayAgents();
displayListings();