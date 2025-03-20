// components.js

function createListingTable(tableBody) {
  const listingsRef = firebase.database().ref('listings');
  listingsRef.on('value', (snapshot) => {
      tableBody.innerHTML = ''; // Clear existing table
      snapshot.forEach((listingSnapshot) => {
          const listing = listingSnapshot.val();
          const row = tableBody.insertRow();

          // Resim (Image Thumbnail)
          const imageCell = row.insertCell();
          if (listing.images && listing.images.length > 0) {
              const img = document.createElement('img');
              img.src = listing.images[0]; // First image
              img.style.width = '50px'; // Adjust thumbnail size as needed
              img.style.height = 'auto';
              imageCell.appendChild(img);
          } else {
              imageCell.textContent = 'No Image';
          }

          // Başlık (Title)
          row.insertCell().textContent = listing.title;

          // Tür (Type)
          row.insertCell().textContent = listing.type;

          // Kategori (Category)
          row.insertCell().textContent = listing.category;

          // Yer (Location)
          row.insertCell().textContent = listing.city;

          // Metrekare (Square Footage)
          row.insertCell().textContent = listing.squareFootage;

          // Oda Sayısı (Bedrooms)
          row.insertCell().textContent = listing.bedrooms;

          // Fiyat (Price)
          row.insertCell().textContent = listing.price;

          // Agent
          row.insertCell().textContent = listing.agentName;

          // Actions (Empty for now)
          row.insertCell().textContent = 'Actions'; // You can add buttons here later
      });
  });
}