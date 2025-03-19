// components.js

// Function to create a dropdown for "Oda Sayısı" (Room Type)
export function createRoomTypeDropdown(selectedValue = "") {
    const select = document.createElement("select");
    const options = ["----", "1+0", "1+1", "2+1", "3+1", "4+1", "5+1", "3+2", "4+2"];
    options.forEach(option => {
      const opt = document.createElement("option");
      opt.value = option;
      opt.text = option;
      if (option === selectedValue) opt.selected = true;
      select.appendChild(opt);
    });
    return select;
  }
  
  // Function to create a dropdown for "Isınma" (Heating)
  export function createHeatingDropdown(selectedValue = "") {
    const select = document.createElement("select");
    const options = ["----", "Klima", "Doğalgaz", "Merkezi (Payölçer)", "Jeotermal", "Soba", "Isı Pompası"];
    options.forEach(option => {
      const opt = document.createElement("option");
      opt.value = option;
      opt.text = option;
      if (option === selectedValue) opt.selected = true;
      select.appendChild(opt);
    });
    return select;
  }
  
  // Function to create a dropdown for "Site İçerisinde" (Site)
  export function createSiteDropdown(selectedValue = "") {
    const select = document.createElement("select");
    const options = ["----", "Evet", "Hayır"];
    options.forEach(option => {
      const opt = document.createElement("option");
      opt.value = option;
      opt.text = option;
      if (option === selectedValue) opt.selected = true;
      select.appendChild(opt);
    });
    return select;
  }
  
  // Function to create a dropdown for "Otopark" (Parking)
  export function createParkingDropdown(selectedValue = "") {
    const select = document.createElement("select");
    const options = ["----", "Evet", "Hayır"];
    options.forEach(option => {
      const opt = document.createElement("option");
      opt.value = option;
      opt.text = option;
      if (option === selectedValue) opt.selected = true;
      select.appendChild(opt);
    });
    return select;
  }
  
  // Function to create a dropdown for "İmar Durumu" (Development Status)
  export function createDevelopmentStatusDropdown(selectedValue = "") {
    const select = document.createElement("select");
    const options = ["----", "Arsa", "Tarla"];
    options.forEach(option => {
      const opt = document.createElement("option");
      opt.value = option;
      opt.text = option;
      if (option === selectedValue) opt.selected = true;
      select.appendChild(opt);
    });
    return select;
  }
  
  // Function to create a dropdown for "Bulunduğu Kat" (Floor)
  export function createFloorDropdown(selectedValue = "") {
    const select = document.createElement("select");
    const options = ["----", "Kot", "Zemin", "Yüksek Giriş"];
    // Add floors 1 to 50
    for (let i = 1; i <= 50; i++) {
      options.push(i.toString());
    }
    options.forEach(option => {
      const opt = document.createElement("option");
      opt.value = option;
      opt.text = option;
      if (option === selectedValue) opt.selected = true;
      select.appendChild(opt);
    });
    return select;
  }
  
  // Function to create a dropdown for "Kat Sayısı" (Total Floors)
  export function createTotalFloorsDropdown(selectedValue = "") {
    const select = document.createElement("select");
    const options = ["----"];
    // Add floors 1 to 50
    for (let i = 1; i <= 50; i++) {
      options.push(i.toString());
    }
    options.forEach(option => {
      const opt = document.createElement("option");
      opt.value = option;
      opt.text = option;
      if (option === selectedValue) opt.selected = true;
      select.appendChild(opt);
    });
    return select;
  }