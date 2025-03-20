// admin.js
import { auth, db } from './firebaseConfig.js';
import { collection, addDoc, getDocs, query, orderBy, limit, where, serverTimestamp, updateDoc, doc, getDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';
import { createUserWithEmailAndPassword, deleteUser, signOut } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { createListingsTable } from './components.js';

// Load Agent Listings
let listingsData = [];
let allListingsData = [];

// Logout function
window.logout = async function() {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error signing out:', error);
        alert('Çıkış yapılırken hata oluştu: ' + error.message);
    }
};

// Check if user is admin
auth.onAuthStateChanged(async (user) => {
    if (user && user.email === "admin@office.com") {
        console.log("Admin logged in:", user.email);
        
        // Load personal listings (admin's listings)
        const listingsDiv = document.getElementById("listings");
        if (listingsDiv) {
            const snapshot = await getDocs(query(collection(db, "properties"), where("agent", "==", user.email)));
            console.log("Admin's listings snapshot size:", snapshot.size);
            listingsDiv.innerHTML = "";
            listingsData = [];
            if (!snapshot.empty) {
                snapshot.forEach(doc => {
                    const data = doc.data();
                    listingsData.push({ id: doc.id, ...data });
                });
                createListingsTable(listingsDiv, listingsData, { showAgent: false });
            } else {
                console.log("No admin listings found");
                listingsDiv.innerHTML = "<p>Henüz ilanınız yok.</p>";
            }
        }

        // Load all listings
        const allListingsDiv = document.getElementById("allListingsContent");
        if (allListingsDiv) {
            const snapshot = await getDocs(query(collection(db, "properties")));
            console.log("All listings snapshot size:", snapshot.size);
            allListingsDiv.innerHTML = "";
            allListingsData = [];
            if (!snapshot.empty) {
                snapshot.forEach(doc => {
                    const data = doc.data();
                    allListingsData.push({ id: doc.id, ...data });
                });
                createListingsTable(allListingsDiv, allListingsData, { showAgent: true });
            } else {
                console.log("No listings found");
                allListingsDiv.innerHTML = "<p>Henüz ilan yok.</p>";
            }
        }

        // Load agents
        loadAgents();
    } else {
        console.log("Not admin or not logged in");
        window.location.href = "index.html";
    }
});

// Load and display agents
async function loadAgents() {
    const agentsTableBody = document.querySelector('#agentsTable tbody');
    if (!agentsTableBody) return;

    try {
        const usersQuery = query(collection(db, 'users'), where('role', '==', 'agent'));
        const agentsSnapshot = await getDocs(usersQuery);
        
        agentsTableBody.innerHTML = '';
        
        for (const agentDoc of agentsSnapshot.docs) {
            const agentData = agentDoc.data();
            
            // Count listings for this agent
            const listingsQuery = query(collection(db, 'properties'), where('agent', '==', agentData.email));
            const listingsSnapshot = await getDocs(listingsQuery);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${agentData.email}</td>
                <td>${agentData.displayName || 'N/A'}</td>
                <td>${listingsSnapshot.size}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="deleteAgent('${agentDoc.id}')">
                        <i class="fas fa-trash-alt me-1"></i>Sil
                    </button>
                </td>
            `;
            agentsTableBody.appendChild(row);
        }
    } catch (error) {
        console.error('Error loading agents:', error);
        alert('Error loading agents: ' + error.message);
    }
}

// Add new agent
window.addAgent = async function() {
    window.location.href = 'add-agent.html';
};

// Delete agent
window.deleteAgent = async function(agentId) {
    if (!confirm('Bu ajanı silmek istediğinizden emin misiniz?')) return;
    
    try {
        const agentDoc = await getDoc(doc(db, 'users', agentId));
        const agentEmail = agentDoc.data().email;
        
        // Delete agent's listings
        const listingsQuery = query(collection(db, 'properties'), where('agent', '==', agentEmail));
        const listingsSnapshot = await getDocs(listingsQuery);
        
        const deletePromises = listingsSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        
        // Delete agent from Firestore
        await deleteDoc(doc(db, 'users', agentId));
        
        // Note: Deleting the user from Firebase Auth requires additional setup
        // You might want to use Cloud Functions for this
        
        alert('Ajan ve ilanları başarıyla silindi!');
        loadAgents(); // Refresh agents list
    } catch (error) {
        console.error('Error deleting agent:', error);
        alert('Error deleting agent: ' + error.message);
    }
};