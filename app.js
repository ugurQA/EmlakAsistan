// app.js
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { collection, addDoc, getDocs, query, orderBy, limit, where, serverTimestamp, updateDoc, doc, getDoc, deleteDoc, setDoc } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js';
import { createListingsTable } from './components.js';

// Initialize Firebase Storage with custom domain
const storage = getStorage(undefined, 'gs://emlakasistan-a76f1.firebasestorage.app');

// Cache mechanism for listings data
let cachedData = {
  personal: null,
  all: null,
  timestamp: null
};

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Function to check if cache is valid
function isCacheValid() {
  return cachedData.timestamp && (Date.now() - cachedData.timestamp) < CACHE_DURATION;
}

// Function to update cache
function updateCache(listings, isAll) {
  if (isAll) {
    cachedData.all = listings;
  } else {
    cachedData.personal = listings;
  }
  cachedData.timestamp = Date.now();
}

// Reset listing counter once
const resetCounterOnce = async () => {
  try {
    const counterRef = doc(db, "counters", "listings");
    const counterDoc = await getDoc(counterRef);
    
    if (!counterDoc.exists()) {
      // Initialize counter if it doesn't exist
      await setDoc(counterRef, { value: 0 });
      console.log('Listing counter initialized to 0');
    }
  } catch (error) {
    console.error('Error initializing counter:', error);
  }
};

// Initialize counter only on pages that need it
if (window.location.pathname.includes('add.html') || window.location.pathname.includes('dashboard.html')) {
  resetCounterOnce();
}

// Load cities and districts data
let locationData = null;
let provinceSelectInitialized = false;

async function loadLocationData() {
  try {
    // Only load data if not already loaded
    if (!locationData) {
      console.log('Loading location data...');
      const response = await fetch('locations/cities_and_districts.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      locationData = await response.json();
      console.log('Location data loaded:', locationData.length, 'cities');
    }

    // Update the province select options
    const provinceSelect = document.getElementById("province");
    if (provinceSelect && !provinceSelectInitialized) {
      // Clear existing options
      provinceSelect.innerHTML = '<option value="----">----</option>';
      
      // Add city options
      locationData.forEach(city => {
        const option = document.createElement('option');
        option.value = city.text;
        option.textContent = city.text;
        provinceSelect.appendChild(option);
      });

      // Add event listener for province selection
      provinceSelect.addEventListener('change', function() {
        const selectedCity = locationData.find(city => city.text === this.value);
        const districtSelect = document.getElementById("district");
        
        if (districtSelect) {
          // Clear and reset district select
          districtSelect.innerHTML = '<option value="----">----</option>';
          
          if (selectedCity) {
            // Add district options
            selectedCity.districts.forEach(district => {
              const option = document.createElement('option');
              option.value = district.text;
              option.textContent = district.text;
              districtSelect.appendChild(option);
            });
            districtSelect.disabled = false;
          } else {
            districtSelect.disabled = true;
          }
        }
      });

      provinceSelectInitialized = true;
    }

    return locationData;
  } catch (error) {
    console.error('Error loading location data:', error);
    alert('Lokasyon verileri yüklenirken bir hata oluştu.');
    return null;
  }
}

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
    
    // Format ID as 4-digit string
    const paddedId = String(newId).padStart(4, '0');
    document.getElementById("listingId").value = paddedId;
    console.log("Generated listingId:", paddedId);

        const photos = document.getElementById("photos").files;
        
        // Validate photos
        if (photos.length > 10) {
          alert('En fazla 10 fotoğraf yükleyebilirsiniz!');
          return;
        }

        // Validate each photo
        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i];
          
          // Check file type
          if (!photo.type.startsWith('image/')) {
            alert('Sadece resim dosyaları yükleyebilirsiniz!');
            return;
          }
          
          // Check file size (5MB limit)
          if (photo.size > 5 * 1024 * 1024) {
            alert('Her fotoğraf en fazla 5MB olabilir!');
            return;
          }
        }

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
          const uploadedFiles = [];
          
          for (let i = 0; i < photos.length; i++) {
            const photo = photos[i];
            const photoRef = ref(storage, `photos/${docRef.id}/${photo.name}`);
            
            const uploadPromise = uploadBytes(photoRef, photo, {
              metadata: {
                agent: user.email,
                contentType: photo.type
              }
            })
              .then(snapshot => {
                console.log(`Successfully uploaded photo ${i + 1}:`, photo.name);
                uploadedFiles.push(snapshot.ref);
                return getDownloadURL(snapshot.ref);
              })
              .then(url => {
                console.log(`Got download URL for photo ${i + 1}:`, url);
                photoUrls.push(url);
              })
              .catch(error => {
                console.error(`Error uploading photo ${i + 1}:`, error);
                // Delete any uploaded files if there's an error
                uploadedFiles.forEach(file => {
                  deleteObject(file).catch(err => console.error('Error deleting file:', err));
                });
                throw error;
              });
            
            uploadPromises.push(uploadPromise);
          }
          
          try {
            await Promise.all(uploadPromises);
            console.log('All photos uploaded successfully. URLs:', photoUrls);
            
            // Update Firestore with photo URLs
            try {
              await updateDoc(docRef, { photos: photoUrls });
              console.log('Firestore document updated with photo URLs');
            } catch (updateError) {
              console.error('Error updating Firestore with photo URLs:', updateError);
              // If Firestore update fails, delete all uploaded photos
              const deletePromises = uploadedFiles.map(file => 
                deleteObject(file).catch(err => console.error('Error deleting photo:', err))
              );
              await Promise.all(deletePromises);
              throw updateError;
            }
          } catch (error) {
            console.error('Error during photo upload:', error);
            alert('Fotoğraf yüklenirken hata oluştu: ' + error.message);
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
  loadLocationData(); // Load location data
  updateSubcategories();
  const typeSelect = document.getElementById("type");
  const categorySelect = document.getElementById("category");
  const photosInput = document.getElementById("photos");
  if (typeSelect) typeSelect.addEventListener("change", updateSubcategories);
  if (categorySelect) categorySelect.addEventListener("change", updateDetails);
  if (photosInput) photosInput.addEventListener("change", displayPhotos);
}

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
let allListingsData = [];

// Load listings function
async function loadListings(showAll = false) {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error('No user logged in');
      return;
    }

    // Check cache first
    if (isCacheValid()) {
      const cachedListings = cachedData.all;
      if (cachedListings) {
        console.log('Using cached listings');
        const container = showAll ? document.getElementById('allListings') : document.getElementById('myListings');
        const listingsToShow = showAll ? cachedListings : cachedListings.filter(listing => listing.agent === user.email);
        renderListings(container, listingsToShow, showAll);
        return;
      }
    }

    // Only fetch all listings once
    if (!allListingsData.length) {
      const q = query(collection(db, 'properties'));
      const querySnapshot = await getDocs(q);
      allListingsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Update cache
      updateCache(allListingsData, true);
    }

    // Filter for personal listings if needed
    const listingsToShow = showAll ? allListingsData : allListingsData.filter(listing => listing.agent === user.email);

    const container = showAll ? document.getElementById('allListings') : document.getElementById('myListings');
    renderListings(container, listingsToShow, showAll);

  } catch (error) {
    console.error('Error loading listings:', error);
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
    // Query users collection for agents
    const q = query(collection(db, 'users'), where('role', '==', 'Temsilci'));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      agentsTableBody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="alert alert-info text-center">
              Henüz temsilci bulunmamaktadır.
            </div>
          </td>
        </tr>`;
      return;
    }

    agentsTableBody.innerHTML = '';
    let rowNumber = 1;
    
    querySnapshot.forEach((doc) => {
      const agent = doc.data();
      const row = document.createElement('tr');
      
      const dateField = agent.createdAt || agent.timestamp;
      const formattedDate = dateField ? dateField.toDate().toLocaleDateString('tr-TR') : '-';
      
      row.innerHTML = `
        <td class="text-center" style="width: 50px; font-size: 0.9rem;">${rowNumber++}</td>
        <td style="width: 150px; font-size: 0.9rem;">${agent.firstName || '-'}</td>
        <td style="width: 150px; font-size: 0.9rem;">${agent.lastName || '-'}</td>
        <td style="width: 150px; font-size: 0.9rem;">${agent.phone || '-'}</td>
        <td class="text-center" style="width: 120px; font-size: 0.9rem;">${formattedDate}</td>
        <td class="text-center" style="width: 100px; font-size: 0.9rem;">${agent.listingCount || '0'}</td>
      `;
      
      row.style.cursor = 'pointer';
      row.onclick = () => window.location.href = `agent-details.html?id=${doc.id}`;
      row.onmouseover = () => row.style.backgroundColor = '#f8f9fa';
      row.onmouseout = () => row.style.backgroundColor = '';
      
      agentsTableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading agents:', error);
    agentsTableBody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="alert alert-danger text-center">
            Temsilciler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.
          </div>
        </td>
      </tr>`;
  }
}

// User role checking function
async function getUserRole(userEmail) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userEmail));
    if (userDoc.exists()) {
      return userDoc.data().role;
    }
    return null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}

// Add after getUserRole function
async function createAdminUser(email) {
  try {
    const adminData = {
      firstName: 'Admin',
      lastName: 'User',
      email: email,
      role: 'Yönetici',
      phone: '-',
      createdAt: serverTimestamp()
    };
    
    await setDoc(doc(db, 'users', email), adminData);
    console.log('Admin user created successfully');
    return true;
  } catch (error) {
    console.error('Error creating admin user:', error);
    return false;
  }
}

// Add after createAdminUser function
async function ensureAdminUsers() {
  const adminEmails = ['admin@office.com', 'admin-test@testapp.com'];
  
  try {
    for (const email of adminEmails) {
      const userDoc = await getDoc(doc(db, 'users', email));
      
      if (!userDoc.exists()) {
        console.log(`Creating admin user for ${email}`);
        await createAdminUser(email);
      } else {
        console.log(`Admin user ${email} already exists`);
      }
    }
    return true;
  } catch (error) {
    console.error('Error ensuring admin users:', error);
    return false;
  }
}

// Modify the loadProfile function
async function loadProfile() {
  const user = auth.currentUser;
  if (!user) return;

  const profileContent = document.querySelector('.profile-content');
  if (!profileContent) return;

  try {
    let userData;
    const userDoc = await getDoc(doc(db, 'users', user.email));
    
    if (!userDoc.exists()) {
      // If user doesn't exist and is admin-test@testapp.com, create admin user
      if (user.email === 'admin-test@testapp.com') {
        await createAdminUser(user.email);
        userData = {
          firstName: 'Admin',
          lastName: 'User',
          role: 'Yönetici',
          phone: '-'
        };
      }
    } else {
      userData = userDoc.data();
    }

    if (userData) {
      const profileHtml = `
        <div class="alert alert-info mb-3">
          <i class="fas fa-info-circle"></i> Kişisel bilgilerinizi değiştirmek için lütfen sistem yöneticiniz ile iletişime geçin.
        </div>
        <table class="table">
          <tbody>
            <tr>
              <th style="width: 200px; background-color: #f8f9fa;">Ad</th>
              <td>${userData.firstName || '-'}</td>
            </tr>
            <tr>
              <th style="background-color: #f8f9fa;">Soyad</th>
              <td>${userData.lastName || '-'}</td>
            </tr>
            <tr>
              <th style="background-color: #f8f9fa;">E-posta</th>
              <td>${user.email}</td>
            </tr>
            <tr>
              <th style="background-color: #f8f9fa;">Telefon</th>
              <td>${userData.phone || '-'}</td>
            </tr>
            <tr>
              <th style="background-color: #f8f9fa;">Rol</th>
              <td>${userData.role || 'Temsilci'}</td>
            </tr>
          </tbody>
        </table>
      `;
      profileContent.innerHTML = profileHtml;
    } else {
      profileContent.innerHTML = '<div class="alert alert-warning">Profil bilgileri bulunamadı.</div>';
    }
  } catch (error) {
    console.error('Error loading profile:', error);
    profileContent.innerHTML = '<div class="alert alert-danger">Profil bilgileri yüklenirken bir hata oluştu.</div>';
  }
}

// Function to initialize filter dropdowns
function initializeFilterDropdowns() {
  const citySelect = document.getElementById('filterCity');
  const roomSelect = document.getElementById('filterRoom');
  const typeSelect = document.getElementById('filterType');
  const categorySelect = document.getElementById('filterCategory');
  const agentSelect = document.getElementById('filterAgent');

  // Clear existing options
  citySelect.innerHTML = '<option value="">İl Seç</option>';
  roomSelect.innerHTML = '<option value="">Oda Sayısı Seç</option>';
  typeSelect.innerHTML = '<option value="">Tür Seç</option>';
  categorySelect.innerHTML = '<option value="">Kategori Seç</option>';
  agentSelect.innerHTML = '<option value="">Temsilci Seç</option>';

  // Add type options
  ['Satılık', 'Kiralık'].forEach(type => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type;
    typeSelect.appendChild(option);
  });

  // Add category options
  ['Konut', 'Arsa'].forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });

  // Add room options
  ['1+0', '1+1', '2+1', '3+1', '4+1', '5+1', '6+1', '7+1', '8+1', '9+1', '10+1'].forEach(room => {
    const option = document.createElement('option');
    option.value = room;
    option.textContent = room;
    roomSelect.appendChild(option);
  });

  // Load cities from location data
  if (locationData) {
    locationData.forEach(city => {
      const option = document.createElement('option');
      option.value = city.text;
      option.textContent = city.text;
      citySelect.appendChild(option);
    });
  }

  // Load agents
  loadAgentFilterOptions();
}

// Update the applyFilters function
window.applyFilters = function() {
  const city = document.getElementById("filterCity").value;
  const room = document.getElementById("filterRoom").value;
  const type = document.getElementById("filterType").value;
  const category = document.getElementById("filterCategory").value;
  const agent = document.getElementById("filterAgent").value;
  
  console.log('Applying filters:', { city, room, type, category, agent });
  
  const activeTab = document.querySelector('.tab-pane.active');
  const isAllListings = activeTab.id === 'allListings';
  const user = auth.currentUser;

  let filteredData = [...allListingsData];

  // Filter by user's listings if on personal tab
  if (!isAllListings && user) {
    filteredData = filteredData.filter(l => l.agent === user.email);
  }

  // Apply filters
  if (city) {
    filteredData = filteredData.filter(l => l.province === city);
    console.log('Filtered by city:', city, 'Count:', filteredData.length);
  }
  
  if (room) {
    filteredData = filteredData.filter(l => l.roomType === room);
    console.log('Filtered by room:', room, 'Count:', filteredData.length);
  }
  
  if (type) {
    filteredData = filteredData.filter(l => l.type === type);
    console.log('Filtered by type:', type, 'Count:', filteredData.length);
  }
  
  if (category) {
    filteredData = filteredData.filter(l => l.category === category);
    console.log('Filtered by category:', category, 'Count:', filteredData.length);
  }
  
  if (agent) {
    filteredData = filteredData.filter(l => l.agent === agent);
    console.log('Filtered by agent:', agent, 'Count:', filteredData.length);
  }

  const container = document.getElementById(isAllListings ? 'allListings' : 'myListings');
  renderListings(container, filteredData, isAllListings);
};

// Function to load agent names for filter dropdown
async function loadAgentFilterOptions() {
  try {
    const filterAgentSelect = document.getElementById('filterAgent');
    if (!filterAgentSelect) return;

    // Clear existing options except the first one
    while (filterAgentSelect.options.length > 1) {
      filterAgentSelect.remove(1);
    }

    // Query users collection for agents
    const q = query(collection(db, 'users'), where('role', '==', 'Temsilci'));
    const querySnapshot = await getDocs(q);
    
    querySnapshot.forEach((doc) => {
      const agent = doc.data();
      const option = document.createElement('option');
      option.value = agent.email;
      option.textContent = `${agent.firstName} ${agent.lastName}`;
      filterAgentSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading agent filter options:', error);
  }
}

window.sortListings = function(criterion) {
  const isAllListings = document.querySelector('#allListings').classList.contains('active');
  const user = auth.currentUser;
  
  let dataToSort = [...allListingsData];
  if (!isAllListings && user) {
    dataToSort = dataToSort.filter(l => l.agent === user.email);
  }
  
  dataToSort.sort((a, b) => (a[criterion] || 0) - (b[criterion] || 0));
  
  const container = isAllListings ? document.getElementById('allListings') : document.getElementById('myListings');
  renderListings(container, dataToSort, isAllListings);
  document.getElementById("sortOptions").style.display = "none";
};

// Delete Listing
window.deleteListing = async function(docId) {
  if (!confirm('Bu ilanı silmek istediğinizden emin misiniz?')) {
    return;
  }

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

// Export db and Firestore functions
export { collection, addDoc, getDoc, doc, updateDoc, deleteDoc, storage, ref, uploadBytes, getDownloadURL, deleteObject };

// Expose signOut to global scope
window.signOut = signOut;

// Update the dashboard initialization to include filter dropdowns
onAuthStateChanged(auth, async (user) => {
  if (user && window.location.pathname.includes("dashboard.html")) {
    console.log("Loading dashboard for user:", user.email);
    
    try {
      // Load location data first
      await loadLocationData();
      
      // Initialize filter dropdowns after location data is loaded
      initializeFilterDropdowns();
      
      // Check user role from users collection
      const userRole = await getUserRole(user.email);
      const isAdmin = userRole === 'Yönetici';
      
      if (isAdmin) {
        // Ensure admin users exist
        await ensureAdminUsers();
      }
      
      // Get all tab elements
      const myListingsTab = document.querySelector('a[href="#myListings"]').parentElement;
      const allListingsTab = document.querySelector('a[href="#allListings"]').parentElement;
      const agentsTab = document.querySelector('a[href="#agents"]').parentElement;
      const profileTab = document.querySelector('a[href="#profile"]').parentElement;

      // Show/hide tabs based on role
      myListingsTab.style.display = ''; // Show for both admin and agent
      allListingsTab.style.display = ''; // Show for both admin and agent
      agentsTab.style.display = isAdmin ? '' : 'none'; // Only show for admin
      profileTab.style.display = ''; // Show for both admin and agent

      // Load agent filter options
      await loadAgentFilterOptions();

      // Initialize Bootstrap tabs
      $(document).ready(async function() {
        try {
          // Get the active tab ID
          const activeTabId = $('.tab-pane.active').attr('id');
          
          // Only load data for the active tab initially
          switch(activeTabId) {
            case 'myListings':
            case 'allListings':
              await loadListings(activeTabId === 'allListings');
              break;
            case 'agents':
              if (isAdmin) await loadAgents();
              break;
            case 'profile':
              await loadProfile();
              break;
          }

          // Handle tab changes
          $('a[data-toggle="tab"]').on('shown.bs.tab', async function (e) {
            const targetId = $(e.target).attr('href').substring(1);
            console.log("Tab changed to:", targetId);
            
            // Load data based on the selected tab
            switch(targetId) {
              case 'myListings':
              case 'allListings':
                await loadListings(targetId === 'allListings');
                break;
              case 'agents':
                if (isAdmin) await loadAgents();
                break;
              case 'profile':
                await loadProfile();
                break;
            }
          });

          // Check if we need to switch to agents tab (coming from add-agent page)
          const returnToAgents = sessionStorage.getItem('returnToAgents');
          if (returnToAgents === 'true' && isAdmin) {
            sessionStorage.removeItem('returnToAgents');
            $('#agents-tab').tab('show');
          }
        } catch (error) {
          console.error("Error loading initial content:", error);
        }
      });
    } catch (error) {
      console.error("Error initializing dashboard:", error);
    }
  }
});

function renderListings(container, data, showAll = false) {
  if (!container) {
    console.error('Container not found');
    return;
  }

  container.innerHTML = '';
  
  const table = document.createElement('table');
  table.className = 'table table-striped table-hover';
  table.style.cssText = `
    border-collapse: collapse;
    --bs-table-cell-padding-x: 0.3rem;
    table-layout: fixed;
    width: 100%;
    font-size: 0.9rem;
  `;

  const columns = [
    { id: 'image', label: 'Fotoğraf', width: '50px', center: true },
    { id: 'listingId', label: 'ID', width: '60px', center: true },
    { id: 'title', label: 'Başlık', width: '200px', center: false },
    { id: 'typeCategory', label: 'Tür/Kategori', width: '120px', center: true },
    { id: 'location', label: 'Konum', width: '120px', center: true },
    { id: 'squareMeters', label: 'Metrekare', width: '90px', center: true },
    { id: 'price', label: 'Fiyat', width: '100px', center: true }
  ];
  
  // Create header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  
  columns.forEach(column => {
    const th = document.createElement('th');
    th.textContent = column.label;
    th.style.width = column.width;
    th.style.padding = '0.5rem 0.3rem';
    if (column.center) {
      th.style.textAlign = 'center';
    }
    headerRow.appendChild(th);
  });
  
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create body
  const tbody = document.createElement('tbody');
  data.forEach(listing => {
    const tr = document.createElement('tr');
    
    // Make the entire row clickable
    tr.style.cursor = 'pointer';
    tr.onclick = () => window.location.href = `listing-details.html?id=${listing.id}`;
    tr.onmouseover = () => tr.style.backgroundColor = '#f8f9fa';
    tr.onmouseout = () => tr.style.backgroundColor = '';
    
    // Image cell
    const tdImage = document.createElement('td');
    tdImage.style.width = '50px';
    tdImage.style.padding = '0.5rem 0.3rem';
    tdImage.style.textAlign = 'center';
    const img = document.createElement('img');
    img.style.width = '40px';
    img.style.height = '40px';
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

    // ID cell
    const tdId = document.createElement('td');
    tdId.style.width = '60px';
    tdId.style.padding = '0.5rem 0.3rem';
    tdId.style.textAlign = 'center';
    tdId.textContent = listing.listingId || '-';
    tr.appendChild(tdId);
    
    // Title cell
    const tdTitle = document.createElement('td');
    tdTitle.style.width = '200px';
    tdTitle.style.padding = '0.5rem 0.3rem';
    tdTitle.textContent = listing.title || 'No title';
    tdTitle.style.whiteSpace = 'nowrap';
    tdTitle.style.overflow = 'hidden';
    tdTitle.style.textOverflow = 'ellipsis';
    tr.appendChild(tdTitle);

    // Type/Category cell combined
    const tdTypeCategory = document.createElement('td');
    tdTypeCategory.style.width = '120px';
    tdTypeCategory.style.padding = '0.5rem 0.3rem';
    tdTypeCategory.style.textAlign = 'center';
    tdTypeCategory.innerHTML = `${listing.type || '-'}<br>${listing.category || '-'}`;
    tr.appendChild(tdTypeCategory);
    
    // Location cell
    const tdLocation = document.createElement('td');
    tdLocation.style.width = '120px';
    tdLocation.style.padding = '0.5rem 0.3rem';
    tdLocation.style.textAlign = 'center';
    tdLocation.innerHTML = listing.province && listing.district ? 
      `${listing.province}<br>${listing.district}` : '-';
    tr.appendChild(tdLocation);

    // Square meters cell
    const tdSquareMeters = document.createElement('td');
    tdSquareMeters.style.width = '90px';
    tdSquareMeters.style.padding = '0.5rem 0.3rem';
    tdSquareMeters.style.textAlign = 'center';
    tdSquareMeters.textContent = listing.squareMeters ? 
      `${listing.squareMeters} m²` : '-';
    tr.appendChild(tdSquareMeters);

    // Price cell
    const tdPrice = document.createElement('td');
    tdPrice.style.width = '100px';
    tdPrice.style.padding = '0.5rem 0.3rem';
    tdPrice.style.textAlign = 'center';
    tdPrice.textContent = listing.price ? 
      `${listing.price.toLocaleString()} TL` : '-';
    tdPrice.style.color = '#dc3545';
    tdPrice.style.fontWeight = 'bold';
    tr.appendChild(tdPrice);

    tbody.appendChild(tr);
  });
  
  table.appendChild(tbody);
  container.appendChild(table);
}