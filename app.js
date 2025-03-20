// app.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, where, serverTimestamp, updateDoc, doc, getDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBbae_WFHcINiBBjEDEyhbDKcaU_Aj7TQw",
  authDomain: "emlakasistan-a76f1.firebaseapp.com",
  projectId: "emlakasistan-a76f1",
  storageBucket: "emlakasistan-a76f1.firebasestorage.app",
  messagingSenderId: "652074794709",
  appId: "1:652074794709:web:82ba55444395a926b56c5c",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
console.log("Firebase initialized:", app.name);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

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

// Initial page load and event listeners for add.html
if (window.location.pathname.includes("add.html")) {
  console.log("Initializing add.html");
  updateSubcategories();
  updateDistricts();
  const typeSelect = document.getElementById("type");
  const categorySelect = document.getElementById("category");
  const provinceSelect = document.getElementById("province");
  const photosInput = document.getElementById("photos");
  const form = document.getElementById("listingForm");
  if (typeSelect) typeSelect.addEventListener("change", updateSubcategories);
  if (categorySelect) categorySelect.addEventListener("change", updateDetails);
  if (provinceSelect) provinceSelect.addEventListener("change", updateDistricts);
  if (photosInput) photosInput.addEventListener("change", displayPhotos);
  if (form) {
    console.log("Attaching form submission listener");
    form.addEventListener("submit", async function(e) {
      e.preventDefault();
      console.log("Form submission intercepted");
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
          for (let i = 0; i < photos.length; i++) {
            const photoRef = ref(storage, `photos/${docRef.id}/${photos[i].name}`);
            uploadPromises.push(uploadBytes(photoRef, photos[i]).then(snapshot => {
              return getDownloadURL(snapshot.ref).then(url => {
                listing.photos.push(url); // Add URL to the listing object
              });
            }));
          }
          await Promise.all(uploadPromises);
          // Update Firestore with photo URLs
          await updateDoc(docRef, { photos: listing.photos });
          console.log("Photos URLs saved:", listing.photos);
        } else {
          console.log("No photos to upload");
        }

        alert(`İlan eklendi! ID: ${newId}`);
        form.reset();
        updateDetails(); // Reset visibility of property details
        document.getElementById("photoPreview").innerHTML = "";
        window.location.href = "dashboard.html";
      } catch (err) {
        console.log("Save error:", err.message);
        alert("İlan kaydedilemedi: " + err.message);
      }
    });
  } else {
    console.error("Form element with id 'listingForm' not found");
  }
}

// Export main functions and attach to window
window.login = function() {
  console.log("Login function called");
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      console.log("Login successful with email:", email);
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
      window.location.href = "index.html"; // Redirect to login page
    })
    .catch(err => {
      console.log("Logout error:", err.message);
      alert("Çıkış yapılırken hata oluştu: " + err.message);
    });
};

// Load Agent Listings
let listingsData = []; // Store listings for filtering/sorting
onAuthStateChanged(auth, (user) => {
  if (user && window.location.pathname.includes("dashboard.html")) {
    console.log("Loading listings for user:", user.email);
    const listingsDiv = document.getElementById("listings");
    if (listingsDiv) {
      getDocs(query(collection(db, "properties"), where("agent", "==", user.email))).then(snapshot => {
        console.log("Query snapshot size:", snapshot.size);
        listingsDiv.innerHTML = ""; // Clear existing content
        listingsData = []; // Reset listings data
        if (!snapshot.empty) {
          // Populate filter dropdowns
          const cities = new Set();
          const rooms = new Set();
          snapshot.forEach(doc => {
            const data = doc.data();
            listingsData.push({ id: doc.id, ...data });
            cities.add(data.province);
            if (data.roomType) rooms.add(data.roomType);
          });

          const filterCity = document.getElementById("filterCity");
          cities.forEach(city => {
            const opt = document.createElement("option");
            opt.value = city;
            opt.text = city;
            filterCity.appendChild(opt);
          });

          const filterRoom = document.getElementById("filterRoom");
          rooms.forEach(room => {
            const opt = document.createElement("option");
            opt.value = room;
            opt.text = room;
            filterRoom.appendChild(opt);
          });

          renderListings(listingsData);
        } else {
          console.log("No listings found for this agent");
          listingsDiv.innerHTML = "<p>Henüz ilanınız yok.</p>";
        }
      }).catch(err => {
        console.log("Listings load error:", err.message);
      });
    }
  }
});

function renderListings(data) {
  const listingsDiv = document.getElementById("listings");
  listingsDiv.innerHTML = "";
  const table = document.createElement("table");
  table.border = "1";
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";

  // Create header row
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  ["Image", "Başlık", "Tür", "Kategori", "Yer", "Metrekare", "Oda Sayısı", "Fiyat", "Actions"].forEach(headerText => {
    const th = document.createElement("th");
    th.textContent = headerText;
    th.style.padding = "4px";
    if (headerText === "Başlık") {
      th.style.width = "30%"; // 3x wider than others (assuming others are ~10%)
    } else if (headerText === "Actions") {
      th.style.width = "5%";
    } else {
      th.style.width = "10%";
    }
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create body
  const tbody = document.createElement("tbody");
  data.forEach(listing => {
    const tr = document.createElement("tr");
    tr.style.textAlign = "center";

    // Thumbnail Image
    const tdImage = document.createElement("td");
    const img = document.createElement("img");
    img.style.width = "50px";
    img.style.height = "50px";
    img.style.objectFit = "cover";
    if (listing.photos && listing.photos.length > 0) {
      img.src = listing.photos[0];
    } else {
      img.src = "";
      img.alt = "No image";
    }
    tdImage.appendChild(img);
    tr.appendChild(tdImage);

    // Başlık (Title)
    const tdTitle = document.createElement("td");
    tdTitle.textContent = listing.title || "No title";
    tdTitle.style.textAlign = "left";
    tr.appendChild(tdTitle);

    // Tür
    const tdType = document.createElement("td");
    tdType.textContent = listing.type;
    tr.appendChild(tdType);

    // Kategori
    const tdCategory = document.createElement("td");
    tdCategory.textContent = listing.category;
    tr.appendChild(tdCategory);

    // Yer (İl/İlçe)
    const tdLocation = document.createElement("td");
    tdLocation.textContent = `${listing.province}/${listing.district}`;
    tr.appendChild(tdLocation);

    // Metrekare
    const tdSquareMeters = document.createElement("td");
    tdSquareMeters.textContent = listing.squareMeters || "";
    tr.appendChild(tdSquareMeters);

    // Oda Sayısı
    const tdRoomType = document.createElement("td");
    tdRoomType.textContent = listing.category === "Konut" ? listing.roomType || "" : "";
    tr.appendChild(tdRoomType);

    // Fiyat
    const tdPrice = document.createElement("td");
    tdPrice.textContent = listing.price ? `${listing.price.toLocaleString()} TL` : "";
    tdPrice.style.color = "red";
    tr.appendChild(tdPrice);

    // Actions (Detay Button)
    const tdActions = document.createElement("td");
    const viewButton = document.createElement("button");
    viewButton.innerHTML = '<i class="fas fa-eye"></i> Detay'; // Icon + "Detay"
    viewButton.className = "detay-btn"; // For styling
    viewButton.onclick = () => window.location.href = `listing-details.html?id=${listing.id}`;
    tdActions.appendChild(viewButton);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  listingsDiv.appendChild(table);
}

window.applyFilters = function() {
  const city = document.getElementById("filterCity").value;
  const room = document.getElementById("filterRoom").value;
  const type = document.getElementById("filterType").value;
  const category = document.getElementById("filterCategory").value;

  let filteredData = [...listingsData];
  if (city) filteredData = filteredData.filter(l => l.province === city);
  if (room) filteredData = filteredData.filter(l => l.roomType === room);
  if (type) filteredData = filteredData.filter(l => l.type === type);
  if (category) filteredData = filteredData.filter(l => l.category === category);

  renderListings(filteredData);
};

window.sortListings = function(criterion) {
  let sortedData = [...listingsData];
  sortedData.sort((a, b) => (a[criterion] || 0) - (b[criterion] || 0));
  renderListings(sortedData);
  document.getElementById("sortOptions").style.display = "none"; // Hide after sorting
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
export { db, collection, addDoc, getDoc, doc, updateDoc, deleteDoc, storage, ref, uploadBytes, getDownloadURL, deleteObject };