// app.js
import { auth, db } from './firebaseConfig.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { collection, addDoc, getDocs, query, orderBy, limit, where, serverTimestamp, updateDoc, doc, getDoc, deleteDoc, setDoc } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js';
import { createListingsTable } from './components.js';

// Initialize Firebase Storage with custom domain
const storage = getStorage(undefined, 'gs://emlakasistan-a76f1.firebasestorage.app');

// Export helper functions
export function updateSubcategories() {
  console.log("updateSubcategories called for type:", document.getElementById("type").value);
  const type = document.getElementById("type").value;
  const categorySelect = document.getElementById("category");
  categorySelect.innerHTML = "";
  const defaultOpt = document.createElement("option");
  defaultOpt.value = "----";
  defaultOpt.text = "----";
  categorySelect.appendChild(defaultOpt);
  if (type === "Satılık") {
    ["Konut", "Arsa"].forEach(option => {
      const opt = document.createElement("option");
      opt.value = option;
      opt.text = option;
      categorySelect.appendChild(opt);
    });
  } else if (type === "Kiralık") {
    const opt = document.createElement("option");
    opt.value = "Konut";
    opt.text = "Konut";
    categorySelect.appendChild(opt);
  }
  updateDetails();
}

export function updateDetails() {
  console.log("updateDetails called for category:", document.getElementById("category").value);
  const category = document.getElementById("category").value;
  const propertyDetails = document.getElementById("propertyDetails");
  const konutDetails = document.getElementById("konutDetails");
  const arsaDetails = document.getElementById("arsaDetails");
  if (propertyDetails) propertyDetails.style.display = category !== "----" ? "block" : "none";
  if (konutDetails) konutDetails.style.display = category === "Konut" ? "block" : "none";
  if (arsaDetails) arsaDetails.style.display = category === "Arsa" ? "block" : "none";
}

export function updateDistricts() {
  console.log("updateDistricts called for province:", document.getElementById("province").value);
  const province = document.getElementById("province").value;
  const districtSelect = document.getElementById("district");
  if (districtSelect) {
    districtSelect.innerHTML = "";
    const defaultOpt = document.createElement("option");
    defaultOpt.value = "----";
    defaultOpt.text = "----";
    districtSelect.appendChild(defaultOpt);
    const districts = {
      "İzmir": ["Buca", "Gaziemir", "Karabağlar", "Bornova", "Balçova"],
      "Aydın": ["Efeler", "Nazilli", "Söke", "Kuşadası", "Didim"],
      "Manisa": ["Yunusemre", "Şehzadeler", "Akhisar", "Turgutlu"],
      "Ankara": ["Çankaya", "Keçiören", "Mamak", "Polatlı", "Eryaman"]
    };
    if (districts[province]) {
      districts[province].forEach(district => {
        const opt = document.createElement("option");
        opt.value = district;
        opt.text = district;
        districtSelect.appendChild(opt);
      });
    }
  }
}

export function displayPhotos(event) {
  console.log("displayPhotos called");
  const photoPreview = document.getElementById("photoPreview");
  if (photoPreview) {
    photoPreview.innerHTML = "";
    const files = event.target.files;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = function(e) {
        const img = document.createElement("img");
        img.src = e.target.result;
        img.style.maxWidth = "200px";
        img.style.margin = "5px";
        photoPreview.appendChild(img);
      };
      reader.readAsDataURL(file);
    }
  }
}

// Add Listing Function
window.addListing = async function() {
  const user = auth.currentUser;
  console.log("Current user before save:", user);
  if (!user) {
    console.log("No authenticated user");
    alert("Please log in first.");
    return;
  }
  console.log("Authenticated user:", user.email);

  try {
    // Get and increment the counter atomically
    const counterRef = doc(db, "counters", "listings");
    let counterDoc = await getDoc(counterRef);
    
    if (!counterDoc.exists()) {
      // Initialize counter if it doesn't exist
      await setDoc(counterRef, { value: 0 });
      counterDoc = await getDoc(counterRef);
    }
    
    // Increment the counter
    const currentValue = counterDoc.data().value || 0;
    const newId = currentValue + 1;
    await updateDoc(counterRef, { value: newId });
    
    // Format ID as 6-digit string
    const paddedId = String(newId).padStart(6, '0');
    document.getElementById("listingId").value = paddedId;
    console.log("Generated listingId:", paddedId);

    const photos = document.getElementById("photos").files;
    const category = document.getElementById("category").value;
    const listing = {
      title: document.getElementById("title").value,
      type: document.getElementById("type").value,
      category: category,
      address: document.getElementById("address").value,
      province: document.getElementById("province").value,
      district: document.getElementById("district").value,
      price: parseFloat(document.getElementById("price").value) || 0,
      contact: document.getElementById("contact").value,
      squareMeters: parseFloat(document.getElementById("squareMeters").value) || 0,
      listingId: paddedId,
      agent: user.email,
      timestamp: serverTimestamp(),
      photos: [] // Array to store photo URLs
    };

    if (category === "Konut") {
      listing.roomType = document.getElementById("roomType").value;
      listing.floor = document.getElementById("floor").value;
      listing.totalFloors = document.getElementById("totalFloors").value;
      listing.heating = document.getElementById("heating").value;
      listing.parking = document.getElementById("parking").value;
      listing.site = document.getElementById("site").value;
      listing.description = document.getElementById("description").value;
      listing.notes = document.getElementById("notes").value;
    } else if (category === "Arsa") {
      listing.developmentStatus = document.getElementById("developmentStatus").value;
    }

    console.log("Attempting to save listing:", listing);
    const docRef = await addDoc(collection(db, "properties"), listing);
    console.log("Listing saved with ID:", docRef.id);

    if (photos.length > 0) {
      const uploadPromises = [];
      const photoUrls = [];
      
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const photoRef = ref(storage, `photos/${docRef.id}/${photo.name}`);
        
        const uploadPromise = uploadBytes(photoRef, photo)
          .then(snapshot => {
            console.log(`Successfully uploaded photo ${i + 1}:`, photo.name);
            return getDownloadURL(snapshot.ref);
          })
          .then(url => {
            console.log(`Got download URL for photo ${i + 1}:`, url);
            photoUrls.push(url);
          })
          .catch(error => {
            console.error(`Error uploading photo ${i + 1}:`, error);
            throw error;
          });
        
        uploadPromises.push(uploadPromise);
      }
      
      try {
        await Promise.all(uploadPromises);
        console.log('All photos uploaded successfully. URLs:', photoUrls);
        
        // Update Firestore with photo URLs
        await updateDoc(docRef, { photos: photoUrls });
        console.log('Firestore document updated with photo URLs');
      } catch (error) {
        console.error('Error during photo upload:', error);
        alert('Error uploading photos: ' + error.message);
        return;
      }
    }

    alert(`İlan eklendi! ID: ${paddedId}`);
    document.getElementById("listingForm").reset();
    updateDetails();
    document.getElementById("photoPreview").innerHTML = "";
    window.location.href = "dashboard.html";
  } catch (err) {
    console.log("Save error:", err.message);
    alert("İlan kaydedilemedi: " + err.message);
  }
};

// Initial page load and event listeners for add.html
if (window.location.pathname.includes("add.html")) {
  console.log("Initializing add.html");
  updateSubcategories();
  updateDistricts();
  const typeSelect = document.getElementById("type");
  const categorySelect = document.getElementById("category");
  const provinceSelect = document.getElementById("province");
  const photosInput = document.getElementById("photos");
  if (typeSelect) typeSelect.addEventListener("change", updateSubcategories);
  if (categorySelect) categorySelect.addEventListener("change", updateDetails);
  if (provinceSelect) provinceSelect.addEventListener("change", updateDistricts);
  if (photosInput) photosInput.addEventListener("change", displayPhotos);
}

// Export main functions and attach to window
window.login = function() {
  console.log("Login function called");
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  
  if (!email || !password) {
    window.showError("Lütfen e-posta ve şifre alanlarını doldurun.");
    return;
  }

  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      console.log("Login successful with email:", email);
      window.location.href = "dashboard.html";
    })
    .catch(err => {
      console.log("Login error: ", err.message);
      let errorMessage = "Giriş yapılırken bir hata oluştu.";
      
      switch (err.code) {
        case 'auth/invalid-email':
          errorMessage = "Geçersiz e-posta adresi.";
          break;
        case 'auth/user-disabled':
          errorMessage = "Bu hesap devre dışı bırakılmış.";
          break;
        case 'auth/user-not-found':
          errorMessage = "Bu e-posta adresiyle kayıtlı bir kullanıcı bulunamadı.";
          break;
        case 'auth/wrong-password':
          errorMessage = "Hatalı şifre.";
          break;
      }
      
      window.showError(errorMessage);
    });
};

window.logout = function() {
  console.log("Logout function called");
  signOut(auth)
    .then(() => {
      console.log("Logout successful");
      window.location.href = "index.html";
    })
    .catch(err => {
      console.log("Logout error:", err.message);
      alert("Çıkış yapılırken hata oluştu: " + err.message);
    });
};

// Load Agent Listings
let listingsData = [];
let allListingsData = [];

// Load listings function
async function loadListings(showAll = false) {
  const user = auth.currentUser;
  if (!user) return;

  console.log("Loading listings for user:", user.email, "showAll:", showAll);
  
  try {
    const containerId = showAll ? "allListings" : "myListings";
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container not found for ${containerId}`);
      return;
    }

    let q;
    if (showAll) {
      q = query(collection(db, "properties"));
    } else {
      q = query(collection(db, "properties"), where("agent", "==", user.email));
    }

    const querySnapshot = await getDocs(q);
    console.log(`${showAll ? "All" : "Personal"} listings snapshot size:`, querySnapshot.size);

    if (querySnapshot.empty) {
      container.innerHTML = '<div class="alert alert-info">Henüz ilan bulunmamaktadır.</div>';
      return;
    }

    const data = [];
    querySnapshot.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() });
    });

    // Sort by timestamp
    data.sort((a, b) => {
      const timeA = a.timestamp?.seconds || 0;
      const timeB = b.timestamp?.seconds || 0;
      return timeB - timeA;
    });

    // Store data for filtering
    if (showAll) {
      allListingsData = data;
      // Update filter dropdowns
      updateFilterDropdowns(data);
    } else {
      listingsData = data;
    }

    renderListings(container, data, showAll);
  } catch (error) {
    console.error("Error loading listings:", error);
    const container = document.getElementById(showAll ? "allListings" : "myListings");
    if (container) {
      container.innerHTML = '<div class="alert alert-danger">İlanlar yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.</div>';
    }
  }
}

// Load agents function
async function loadAgents() {
  const agentsTableBody = document.querySelector('#agentsTable tbody');
  if (!agentsTableBody) {
    console.error('Agents table body not found');
    return;
  }

  try {
    const querySnapshot = await getDocs(collection(db, 'agents'));
    
    if (querySnapshot.empty) {
      agentsTableBody.innerHTML = `
        <tr>
          <td colspan="4">
            <div class="alert alert-info text-center">
              Henüz temsilci bulunmamaktadır.
            </div>
          </td>
        </tr>`;
      return;
    }

    agentsTableBody.innerHTML = '';
    querySnapshot.forEach((doc) => {
      const agent = doc.data();
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${agent.firstName || '-'}</td>
        <td>${agent.lastName || '-'}</td>
        <td>${agent.listingCount || 0}</td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="window.location.href='agent-details.html?id=${doc.id}'">
            <i class="fas fa-eye"></i> Detay
          </button>
        </td>
      `;
      agentsTableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading agents:', error);
    agentsTableBody.innerHTML = `
      <tr>
        <td colspan="4">
          <div class="alert alert-danger text-center">
            Temsilciler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.
          </div>
        </td>
      </tr>`;
  }
}

// Dashboard initialization
onAuthStateChanged(auth, async (user) => {
  if (user && window.location.pathname.includes("dashboard.html")) {
    console.log("Loading dashboard for user:", user.email);
    const isAdmin = user.email === 'admin@office.com';
    
    // Get all tab elements
    const myListingsTab = document.querySelector('a[href="#myListings"]').parentElement;
    const allListingsTab = document.querySelector('a[href="#allListings"]').parentElement;
    const agentsTab = document.querySelector('a[href="#agents"]').parentElement;

    // Show/hide tabs based on role
    myListingsTab.style.display = ''; // Show for both admin and agent
    allListingsTab.style.display = ''; // Show for both admin and agent
    agentsTab.style.display = isAdmin ? '' : 'none'; // Only show for admin

    // Initialize Bootstrap tabs
    $(document).ready(async function() {
      try {
        // Load all content immediately
        await Promise.all([
          loadListings(false),  // Load personal listings
          loadListings(true),   // Load all listings
          isAdmin ? loadAgents() : Promise.resolve() // Load agents if admin
        ]);

        // Handle tab changes
        $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
          const targetId = $(e.target).attr('href').substring(1);
          console.log("Tab changed to:", targetId);
        });

        // Check if we need to switch to agents tab (coming from add-agent page)
        const returnToAgents = sessionStorage.getItem('returnToAgents');
        if (returnToAgents === 'true' && isAdmin) {
          sessionStorage.removeItem('returnToAgents');
          // Use Bootstrap's tab API to switch tabs
          $('#agents-tab').tab('show');
        }
      } catch (error) {
        console.error("Error loading initial content:", error);
      }
    });
  }
});

function renderListings(container, data, showAgent = false) {
  createListingsTable(container, data, {
    showAgent: showAgent,
    onViewClick: (id) => window.location.href = `listing-details.html?id=${id}`
  });
}

window.applyFilters = function() {
  const city = document.getElementById("filterCity").value;
  const room = document.getElementById("filterRoom").value;
  const type = document.getElementById("filterType").value;
  const category = document.getElementById("filterCategory").value;
  const activeTab = document.querySelector('.tab-pane.active');
  const isAllListings = activeTab.id === 'allListings';
  
  let dataToFilter = isAllListings ? allListingsData : listingsData;
  let filteredData = [...dataToFilter];

  if (city) filteredData = filteredData.filter(l => l.province === city);
  if (room) filteredData = filteredData.filter(l => l.roomType === room);
  if (type) filteredData = filteredData.filter(l => l.type === type);
  if (category) filteredData = filteredData.filter(l => l.category === category);

  const container = isAllListings ? document.getElementById('allListingsContent') : document.getElementById('listings');
  renderListings(container, filteredData, isAllListings);
};

window.sortListings = function(criterion) {
  const activeTab = document.querySelector('.tab-pane.active');
  const isAllListings = activeTab.id === 'allListings';
  
  let dataToSort = isAllListings ? allListingsData : listingsData;
  let sortedData = [...dataToSort];
  sortedData.sort((a, b) => (a[criterion] || 0) - (b[criterion] || 0));
  
  const container = isAllListings ? document.getElementById('allListingsContent') : document.getElementById('listings');
  renderListings(container, sortedData, isAllListings);
  document.getElementById("sortOptions").style.display = "none";
};

// Add Agent (Admin)
window.addAgent = function() {
  window.location.href = 'add-agent.html';
};

// Delete Listing
window.deleteListing = async function(docId) {
  console.log("Deleting listing with ID:", docId);
  try {
    const listingRef = doc(db, "properties", docId);
    const listingSnap = await getDoc(listingRef);
    if (listingSnap.exists()) {
      const photos = listingSnap.data().photos || [];
      const deletePhotoPromises = photos.map(photoUrl => {
        const photoRef = ref(storage, photoUrl);
        return deleteObject(photoRef).catch(err => console.log("Error deleting photo:", err));
      });
      await Promise.all(deletePhotoPromises);
    }

    await deleteDoc(listingRef);
    console.log("Listing deleted successfully");
    alert("İlan başarıyla silindi!");
    window.location.href = "dashboard.html";
  } catch (err) {
    console.log("Delete error:", err.message);
    alert("İlan silinirken hata oluştu: " + err.message);
  }
};

// Delete agent function
window.deleteAgent = async (agentId) => {
  if (!confirm('Bu temsilciyi silmek istediğinizden emin misiniz?')) {
    return;
  }

  try {
    await deleteDoc(doc(db, 'agents', agentId));
    await loadAgents(); // Refresh the agents list
    alert('Temsilci başarıyla silindi.');
  } catch (error) {
    console.error('Error deleting agent:', error);
    alert('Temsilci silinirken bir hata oluştu.');
  }
};

// Helper function to update filter dropdowns
function updateFilterDropdowns(data) {
  const cities = new Set();
  const rooms = new Set();
  data.forEach(listing => {
    if (listing.province) cities.add(listing.province);
    if (listing.roomType) rooms.add(listing.roomType);
  });

  const filterCity = document.getElementById("filterCity");
  if (filterCity) {
    filterCity.innerHTML = '<option value="">İl Seç</option>';
    Array.from(cities).sort().forEach(city => {
      const opt = document.createElement("option");
      opt.value = city;
      opt.text = city;
      filterCity.appendChild(opt);
    });
  }

  const filterRoom = document.getElementById("filterRoom");
  if (filterRoom) {
    filterRoom.innerHTML = '<option value="">Oda Sayısı Seç</option>';
    Array.from(rooms).sort().forEach(room => {
      const opt = document.createElement("option");
      opt.value = room;
      opt.text = room;
      filterRoom.appendChild(opt);
    });
  }
}

// Export db and Firestore functions
export { collection, addDoc, getDoc, doc, updateDoc, deleteDoc, storage, ref, uploadBytes, getDownloadURL, deleteObject };