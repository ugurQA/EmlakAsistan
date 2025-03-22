// app.js
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { collection, addDoc, getDocs, query, orderBy, limit, where, serverTimestamp, updateDoc, doc, getDoc, deleteDoc, setDoc } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js';
import { createListingsTable } from './components.js';

// Initialize Firebase Storage with custom domain
const storage = getStorage(undefined, 'gs://emlakasistan-a76f1.firebasestorage.app');

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
      const response = await fetch('locations/cities_and_districts.json');
      locationData = await response.json();
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

  } catch (error) {
    console.error('Error loading location data:', error);
    alert('Lokasyon verileri yüklenirken bir hata oluştu.');
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
let listingsData = [];
let allListingsData = [];
let agentMap = new Map(); // Store agent data globally

// Load agents function
async function loadAgentFilter() {
  try {
    const agentsSnapshot = await getDocs(collection(db, 'agents'));
    const filterAgent = document.getElementById('filterAgent');
    agentMap.clear(); // Clear existing data
    
    if (filterAgent) {
      filterAgent.innerHTML = '<option value="">Temsilci Seç</option>';
      agentsSnapshot.forEach(doc => {
        const agent = doc.data();
        const fullName = `${agent.firstName} ${agent.lastName}`;
        agentMap.set(agent.email, fullName);
        filterAgent.innerHTML += `<option value="${agent.email}">${fullName}</option>`;
      });
    }
  } catch (error) {
    console.error('Error loading agents for filter:', error);
  }
}

// Load listings function
async function loadListings(showAll = false) {
  const user = auth.currentUser;
  if (!user) return;

  console.log("Loading listings for user:", user.email, "showAll:", showAll);
  
  try {
    // Load agents first if showing all listings
    if (showAll) {
      await loadAgentFilter();
    }

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
          <td colspan="7">
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
      
      // Get the date from either createdAt or timestamp field
      const dateField = agent.createdAt || agent.timestamp || agent.dateCreated;
      const formattedDate = dateField ? dateField.toDate().toLocaleDateString('tr-TR') : '-';
      
      // Create cells with consistent styling
      row.innerHTML = `
        <td class="text-center" style="width: 50px;">${rowNumber++}</td>
        <td style="width: 150px;">${agent.firstName || '-'}</td>
        <td style="width: 150px;">${agent.lastName || '-'}</td>
        <td style="width: 150px;">${agent.phone || '-'}</td>
        <td class="text-center" style="width: 120px;">${formattedDate}</td>
        <td class="text-center" style="width: 100px;">${agent.listingCount || '0'}</td>
        <td class="text-center" style="width: 80px;">
          <button class="btn btn-primary btn-sm d-flex align-items-center justify-content-center" 
                  style="width: 32px; height: 32px; padding: 0; margin: 0 auto;"
                  onclick="window.location.href='agent-details.html?id=${doc.id}'">
            <i class="fas fa-eye" style="margin: 0;"></i>
          </button>
        </td>
      `;
      
      agentsTableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading agents:', error);
    agentsTableBody.innerHTML = `
      <tr>
        <td colspan="7">
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
    const isAdmin = user.email === 'admin@office.com' || user.email === 'admin-test@testapp.com';
    
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

    // Initialize Bootstrap tabs
    $(document).ready(async function() {
      try {
        // Load all content immediately
        await Promise.all([
          loadListings(false),  // Load personal listings
          loadListings(true),   // Load all listings
          isAdmin ? loadAgents() : Promise.resolve(), // Load agents if admin
          loadProfile() // Load profile for all users
        ]);

        // Handle tab changes
        $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
          const targetId = $(e.target).attr('href').substring(1);
          console.log("Tab changed to:", targetId);
          if (targetId === 'profile') {
            loadProfile();
          }
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
  container.innerHTML = '';
  
  const table = document.createElement('table');
  table.className = 'table table-striped table-hover';
  table.style.cssText = `
    border-collapse: collapse;
    --bs-table-cell-padding-x: 0.3rem;
    table-layout: fixed;
    width: 100%;
  `;
  
  // Create header
  const thead = document.createElement('thead');
  thead.className = 'thead-light';
  const headerRow = document.createElement('tr');
  
  const columns = [
    { id: 'image', label: 'Fotoğraf', width: '50px' },
    { id: 'listingId', label: 'ID', width: '60px' },
    { id: 'title', label: 'Başlık', width: '200px' },
    { id: 'typeCategory', label: 'Tür/Kategori', width: '120px' },
    { id: 'location', label: 'Konum', width: '120px' },
    { id: 'squareMeters', label: 'Metrekare', width: '90px' },
    { id: 'price', label: 'Fiyat', width: '100px' },
    ...(showAgent ? [{ id: 'agent', label: 'Temsilci', width: '150px' }] : []),
    { id: 'actions', label: '', width: '44px' }
  ];
  
  columns.forEach(column => {
    const th = document.createElement('th');
    th.textContent = column.label;
    th.style.width = column.width;
    th.style.padding = '0.5rem 0.3rem';
    headerRow.appendChild(th);
  });
  
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create body
  const tbody = document.createElement('tbody');
  data.forEach(listing => {
    const tr = document.createElement('tr');
    
    // Image cell
    const tdImage = document.createElement('td');
    tdImage.style.width = '50px';
    tdImage.style.padding = '0.5rem 0.3rem';
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
    tdTypeCategory.textContent = `${listing.type || '-'}/${listing.category || '-'}`;
    tr.appendChild(tdTypeCategory);
    
    // Location cell
    const tdLocation = document.createElement('td');
    tdLocation.style.width = '120px';
    tdLocation.style.padding = '0.5rem 0.3rem';
    tdLocation.textContent = listing.province && listing.district ? 
      `${listing.province}/${listing.district}` : '-';
    tr.appendChild(tdLocation);

    // Square meters cell
    const tdSquareMeters = document.createElement('td');
    tdSquareMeters.style.width = '90px';
    tdSquareMeters.style.padding = '0.5rem 0.3rem';
    tdSquareMeters.textContent = listing.squareMeters ? 
      `${listing.squareMeters} m²` : '-';
    tr.appendChild(tdSquareMeters);

    // Price cell
    const tdPrice = document.createElement('td');
    tdPrice.style.width = '100px';
    tdPrice.style.padding = '0.5rem 0.3rem';
    tdPrice.textContent = listing.price ? 
      `${listing.price.toLocaleString()} TL` : '-';
    tdPrice.style.color = '#dc3545';
    tdPrice.style.fontWeight = 'bold';
    tr.appendChild(tdPrice);

    // Agent cell (optional)
    if (showAgent) {
      const tdAgent = document.createElement('td');
      tdAgent.style.width = '150px';
      tdAgent.style.padding = '0.5rem 0.3rem';
      tdAgent.textContent = listing.agent || '-';
      tr.appendChild(tdAgent);
    }
    
    // Actions cell
    const tdActions = document.createElement('td');
    tdActions.style.width = '44px';
    tdActions.style.padding = '0.5rem 4px 0.5rem 4px';
    const viewButton = document.createElement('button');
    viewButton.className = 'btn btn-primary btn-sm d-flex align-items-center justify-content-center';
    viewButton.style.fontSize = '0.875rem';
    viewButton.style.padding = '0';
    viewButton.style.width = '32px';
    viewButton.style.height = '32px';
    viewButton.style.lineHeight = '1';
    viewButton.style.minWidth = '32px';
    viewButton.style.marginLeft = '2px';
    viewButton.innerHTML = '<i class="fas fa-eye" style="margin: 0; display: block;"></i>';
    viewButton.title = 'Detay';
    viewButton.onclick = () => window.location.href = `listing-details.html?id=${listing.id}`;
    tdActions.appendChild(viewButton);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });
  
  table.appendChild(tbody);
  container.appendChild(table);
}

// Helper function to update filter dropdowns
function updateFilterDropdowns(data) {
  const cities = new Set();
  const rooms = new Set();
  const agents = new Set();
  
  data.forEach(listing => {
    if (listing.province) cities.add(listing.province);
    if (listing.roomType) rooms.add(listing.roomType);
    if (listing.agent) {
      const agentName = agentMap.get(listing.agent) || listing.agent;
      agents.add(agentName);
    }
  });

  // Update city filter
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

  // Update room filter
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

  // Update agent filter
  const filterAgent = document.getElementById("filterAgent");
  if (filterAgent) {
    filterAgent.innerHTML = '<option value="">Temsilci Seç</option>';
    Array.from(agents).sort().forEach(agentName => {
      const opt = document.createElement("option");
      opt.value = agentName;
      opt.text = agentName;
      filterAgent.appendChild(opt);
    });
  }
}

// Update the applyFilters function to include agent filtering
window.applyFilters = function() {
  const city = document.getElementById("filterCity").value;
  const room = document.getElementById("filterRoom").value;
  const type = document.getElementById("filterType").value;
  const category = document.getElementById("filterCategory").value;
  const agent = document.getElementById("filterAgent").value;
  
  const activeTab = document.querySelector('.tab-pane.active');
  const isAllListings = activeTab.id === 'allListings';

  let dataToFilter = isAllListings ? allListingsData : listingsData;
  let filteredData = [...dataToFilter];

  if (city) filteredData = filteredData.filter(l => l.province === city);
  if (room) filteredData = filteredData.filter(l => l.roomType === room);
  if (type) filteredData = filteredData.filter(l => l.type === type);
  if (category) filteredData = filteredData.filter(l => l.category === category);
  if (agent) filteredData = filteredData.filter(l => {
    const agentName = agentMap.get(l.agent) || l.agent;
    return agentName === agent;
  });

  const container = document.getElementById(isAllListings ? 'allListings' : 'myListings');
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

// Load profile information
async function loadProfile() {
  const user = auth.currentUser;
  if (!user) return;

  const profileContent = document.querySelector('.profile-content');
  if (!profileContent) return;

  try {
    let userData;
    
    if (user.email === 'admin@office.com' || user.email === 'admin-test@testapp.com') {
      // For admin, get data from users collection
      const userDoc = await getDoc(doc(db, 'users', user.email));
      userData = userDoc.data();
    } else {
      // For agents, get data from agents collection
      const agentsSnapshot = await getDocs(query(collection(db, 'agents'), where('email', '==', user.email)));
      if (!agentsSnapshot.empty) {
        userData = agentsSnapshot.docs[0].data();
      }
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
              <td>${user.email === 'admin@office.com' ? 'Yönetici' : 'Temsilci'}</td>
            </tr>
          </tbody>
        </table>
      `;
      profileContent.innerHTML = profileHtml;
    } else {
      // If no user data found, create default admin data
      if (user.email === 'admin@office.com') {
        const defaultAdminData = {
          firstName: 'Admin',
          lastName: 'User',
          phone: '-',
          role: 'Yönetici'
        };
        await setDoc(doc(db, 'users', 'admin@office.com'), defaultAdminData);
        loadProfile(); // Reload profile with new data
      } else {
        profileContent.innerHTML = '<div class="alert alert-warning">Profil bilgileri bulunamadı.</div>';
      }
    }
  } catch (error) {
    console.error('Error loading profile:', error);
    profileContent.innerHTML = '<div class="alert alert-danger">Profil bilgileri yüklenirken bir hata oluştu.</div>';
  }
}

// Add event listener for tab changes
document.addEventListener('DOMContentLoaded', function() {
  const tabs = document.querySelectorAll('a[data-toggle="tab"]');

  tabs.forEach(tab => {
    tab.addEventListener('shown.bs.tab', function (e) {
      const targetId = e.target.getAttribute('href').substring(1);
      
      // Load profile if profile tab is selected
      if (targetId === 'profile') {
        loadProfile();
      }
    });
  });
});

// Export db and Firestore functions
export { collection, addDoc, getDoc, doc, updateDoc, deleteDoc, storage, ref, uploadBytes, getDownloadURL, deleteObject };