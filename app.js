// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, where, serverTimestamp, updateDoc } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js';

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
  if (propertyDetails) propertyDetails.style.display = "block";
  if (konutDetails) konutDetails.style.display = "none";
  if (arsaDetails) arsaDetails.style.display = "none";
  if (category === "Konut" && konutDetails) {
    konutDetails.style.display = "block";
  } else if (category === "Arsa" && arsaDetails) {
    arsaDetails.style.display = "block";
  }
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
    form.addEventListener("submit", function(e) {
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

      getDocs(query(collection(db, "properties"), orderBy("listingId", "desc"), limit(1))).then(snapshot => {
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
        addDoc(collection(db, "properties"), listing).then(docRef => {
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
            Promise.all(uploadPromises).then(() => {
              // Update Firestore with photo URLs
              return updateDoc(docRef, { photos: listing.photos }).then(() => {
                console.log("Photos URLs saved:", listing.photos);
                alert(`İlan eklendi! ID: ${newId}`);
                window.location.href = "dashboard.html";
              });
            }).catch(err => {
              console.log("Photo upload or URL retrieval error:", err.message);
              alert("Fotoğraf yükleme veya URL alma hatası: " + err.message);
            });
          } else {
            console.log("No photos to upload");
            alert(`İlan eklendi! ID: ${newId}`);
            window.location.href = "dashboard.html";
          }
        }).catch(err => {
          console.log("Save error:", err.message);
          alert("İlan kaydedilemedi: " + err.message);
        });
      }).catch(err => {
        console.log("ID query error:", err.message);
        alert("Hata oluştu: " + err.message);
      });
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

// Load Agent Listings
onAuthStateChanged(auth, (user) => {
  if (user && window.location.pathname.includes("dashboard.html")) {
    console.log("Loading listings for user:", user.email);
    const listingsDiv = document.getElementById("listings");
    if (listingsDiv) {
      getDocs(query(collection(db, "properties"), where("agent", "==", user.email))).then(snapshot => {
        console.log("Query snapshot size:", snapshot.size);
        listingsDiv.innerHTML = ""; // Clear existing content
        if (!snapshot.empty) {
          // Create table
          const table = document.createElement("table");
          table.border = "1";
          table.style.width = "100%";
          table.style.borderCollapse = "collapse";

          // Create header row
          const thead = document.createElement("thead");
          const headerRow = document.createElement("tr");
          ["Image", "Tür", "Kategori", "Yer", "Metrekare", "Oda Sayısı", "Fiyat", "Actions"].forEach(headerText => {
            const th = document.createElement("th");
            th.textContent = headerText;
            th.style.padding = "8px";
            headerRow.appendChild(th);
          });
          thead.appendChild(headerRow);
          table.appendChild(thead);

          // Create body
          const tbody = document.createElement("tbody");
          snapshot.forEach(doc => {
            const data = doc.data();
            const tr = document.createElement("tr");
            tr.style.textAlign = "center";

            // Thumbnail Image
            const tdImage = document.createElement("td");
            const img = document.createElement("img");
            img.style.width = "50px";
            img.style.height = "50px";
            img.style.objectFit = "cover";
            if (data.photos && data.photos.length > 0) {
              img.src = data.photos[0]; // Use the first photo as thumbnail
            } else {
              img.src = ""; // No placeholder, just empty if no photos
              img.alt = "No image available";
            }
            tdImage.appendChild(img);
            tr.appendChild(tdImage);

            // Tür
            const tdType = document.createElement("td");
            tdType.textContent = data.type;
            tr.appendChild(tdType);

            // Kategori
            const tdCategory = document.createElement("td");
            tdCategory.textContent = data.category;
            tr.appendChild(tdCategory);

            // Yer (İl/İlçe)
            const tdLocation = document.createElement("td");
            tdLocation.textContent = `${data.province}/${data.district}`;
            tr.appendChild(tdLocation);

            // Metrekare
            const tdSquareMeters = document.createElement("td");
            tdSquareMeters.textContent = data.squareMeters || "N/A";
            tr.appendChild(tdSquareMeters);

            // Oda Sayısı (empty for Arsa)
            const tdRoomType = document.createElement("td");
            tdRoomType.textContent = data.category === "Konut" ? data.roomType || "N/A" : "";
            tr.appendChild(tdRoomType);

            // Fiyat
            const tdPrice = document.createElement("td");
            tdPrice.textContent = data.price ? `${data.price.toLocaleString()} TL` : "N/A";
            tr.appendChild(tdPrice);

            // Actions (View Button)
            const tdActions = document.createElement("td");
            const viewButton = document.createElement("button");
            viewButton.textContent = "View";
            viewButton.onclick = () => window.location.href = `listing-details.html?id=${doc.id}`;
            tdActions.appendChild(viewButton);
            tr.appendChild(tdActions);

            tbody.appendChild(tr);
          });
          table.appendChild(tbody);
          listingsDiv.appendChild(table);
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

// Placeholder for editListing
window.editListing = function(docId) {
  alert("Düzenleme özelliği henüz geliştirilmedi. ID: " + docId);
};