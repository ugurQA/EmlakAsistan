// app.js
import { auth, db } from './firebaseConfig.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { collection, addDoc, getDocs, query, orderBy, limit, where, serverTimestamp, updateDoc, doc, getDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';
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
    const snapshot = await getDocs(query(collection(db, "properties"), orderBy("listingId", "desc"), limit(1)));
    let newId = 1;
    if (!snapshot.empty) {
      newId = snapshot.docs[0].data().listingId + 1;
    }
    document.getElementById("listingId").value = newId;
    console.log("Generated listingId:", newId);

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
      listingId: newId,
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

    alert(`İlan eklendi! ID: ${newId}`);
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
  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      console.log("Login successful with email:", email);
      // Store user role in localStorage
      localStorage.setItem('userRole', email === "admin@office.com" ? 'admin' : 'agent');
      if (email === "admin@office.com") {
        window.location.href = "admin.html";
      } else {
        window.location.href = "dashboard.html";
      }
    })
    .catch(err => {
      console.log("Login error: ", err.message);
      alert(err.message);
    });
};

window.logout = function() {
  console.log("Logout function called");
  signOut(auth)
    .then(() => {
      console.log("Logout successful");
      localStorage.removeItem('userRole'); // Clear user role
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

onAuthStateChanged(auth, (user) => {
  if (user && window.location.pathname.includes("dashboard.html")) {
    console.log("Loading listings for user:", user.email);
    
    // Load personal listings
    const listingsDiv = document.getElementById("listings");
    if (listingsDiv) {
      getDocs(query(collection(db, "properties"), where("agent", "==", user.email))).then(snapshot => {
        console.log("Personal listings snapshot size:", snapshot.size);
        listingsDiv.innerHTML = ""; // Clear existing content
        listingsData = []; // Reset listings data
        if (!snapshot.empty) {
          snapshot.forEach(doc => {
            const data = doc.data();
            listingsData.push({ id: doc.id, ...data });
          });
          renderListings(listingsDiv, listingsData, false);
        } else {
          console.log("No personal listings found");
          listingsDiv.innerHTML = "<p>Henüz ilanınız yok.</p>";
        }
      }).catch(err => {
        console.log("Personal listings load error:", err.message);
      });
    }

    // Load all listings
    const allListingsDiv = document.getElementById("allListingsContent");
    if (allListingsDiv) {
      getDocs(query(collection(db, "properties"))).then(snapshot => {
        console.log("All listings snapshot size:", snapshot.size);
        allListingsDiv.innerHTML = ""; // Clear existing content
        allListingsData = []; // Reset all listings data
        if (!snapshot.empty) {
          snapshot.forEach(doc => {
            const data = doc.data();
            allListingsData.push({ id: doc.id, ...data });
          });
          renderListings(allListingsDiv, allListingsData, true);
        } else {
          console.log("No listings found");
          allListingsDiv.innerHTML = "<p>Henüz ilan yok.</p>";
        }

        // Populate filter dropdowns with all available options
        const cities = new Set();
        const rooms = new Set();
        allListingsData.forEach(listing => {
          if (listing.province) cities.add(listing.province);
          if (listing.roomType) rooms.add(listing.roomType);
        });

        const filterCity = document.getElementById("filterCity");
        if (filterCity) {
          filterCity.innerHTML = '<option value="">İl Seç</option>';
          cities.forEach(city => {
            const opt = document.createElement("option");
            opt.value = city;
            opt.text = city;
            filterCity.appendChild(opt);
          });
        }

        const filterRoom = document.getElementById("filterRoom");
        if (filterRoom) {
          filterRoom.innerHTML = '<option value="">Oda Sayısı Seç</option>';
          rooms.forEach(room => {
            const opt = document.createElement("option");
            opt.value = room;
            opt.text = room;
            filterRoom.appendChild(opt);
          });
        }
      }).catch(err => {
        console.log("All listings load error:", err.message);
      });
    }
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

// Admin Dashboard
if (window.location.pathname.includes("admin.html")) {
  getDocs(query(collection(db, "properties"))).then(snapshot => {
    const agentStats = {};
    const allListingsDiv = document.getElementById("allListings");
    allListingsDiv.innerHTML = "";
    snapshot.forEach(doc => {
      const data = doc.data();
      agentStats[data.agent] = (agentStats[data.agent] || 0) + 1;
      allListingsDiv.innerHTML += `<p>${data.title} - ${data.category} (ID: ${data.listingId}) - ${data.agent}</p>`;
    });
    document.getElementById("agentStats").innerHTML = Object.entries(agentStats)
      .map(([agent, count]) => `<p>${agent}: ${count} ilan</p>`).join("");
  }).catch(err => {
    console.log("Admin data load error:", err.message);
  });
}

// Add Agent (Admin)
window.addAgent = function() {
  const email = prompt("Yeni ajan e-postası:");
  const password = prompt("Yeni ajan şifresi:");
  if (email && password) {
    createUserWithEmailAndPassword(auth, email, password)
      .then(() => alert("Ajan eklendi!"))
      .catch(err => alert(err.message));
  }
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

// Export db and Firestore functions
export { collection, addDoc, getDoc, doc, updateDoc, deleteDoc, storage, ref, uploadBytes, getDownloadURL, deleteObject };