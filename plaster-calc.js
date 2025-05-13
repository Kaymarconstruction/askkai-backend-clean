// === Configuration ===
const SHEET_WIDTH = 1.2; // 1.2m standard width
const SHEET_HEIGHTS = [2.4, 3.0, 3.6, 4.2, 4.8, 5.4, 6.0];

let rooms = [];
let currentRoom = { walls: [] };

// === DOM Elements ===
const ceilingHeightInput = document.getElementById('ceilingHeight');
const sheetHeightDisplay = document.getElementById('sheetHeight');
const wallInputsContainer = document.getElementById('wallInputs');
const materialsSummary = document.getElementById('materialsSummary');

ceilingHeightInput.addEventListener('input', updateSheetHeight);

// === Functions ===
function updateSheetHeight() {
  const height = parseFloat(ceilingHeightInput.value);
  if (isNaN(height) || height < 2.4) {
    sheetHeightDisplay.textContent = 'Minimum 2.4m';
    return;
  }
  const suggestedHeight = SHEET_HEIGHTS.find(h => h >= height) || 6.0;
  sheetHeightDisplay.textContent = `${suggestedHeight}m`;
  currentRoom.sheetHeight = suggestedHeight;
}

function addWall() {
  const wallId = `wall-${currentRoom.walls.length}`;
  const wallInputHTML = `
    <div class="flex space-x-2 items-center">
      <input id="${wallId}" type="number" min="0" step="0.1" class="w-full border rounded-lg p-2" placeholder="Wall Length (m)">
      <button onclick="removeWall('${wallId}')" class="text-red-600 font-bold text-xl">✖</button>
    </div>`;
  wallInputsContainer.insertAdjacentHTML('beforeend', wallInputHTML);
  currentRoom.walls.push({ id: wallId, length: 0 });

  document.getElementById(wallId).addEventListener('input', e => {
    const wall = currentRoom.walls.find(w => w.id === wallId);
    wall.length = parseFloat(e.target.value) || 0;
  });
}

function removeWall(wallId) {
  currentRoom.walls = currentRoom.walls.filter(w => w.id !== wallId);
  document.getElementById(wallId).parentElement.remove();
}

function addRoom() {
  if (!currentRoom.sheetHeight) {
    alert('Please enter a valid ceiling height first.');
    return;
  }
  rooms.push({ ...currentRoom });
  currentRoom = { walls: [] };
  wallInputsContainer.innerHTML = '';
  ceilingHeightInput.value = '';
  sheetHeightDisplay.textContent = 'Auto-filled';
  generateSummary();
}

function generateSummary() {
  let sheetCounts = {};

  rooms.forEach(room => {
    const totalWallLength = room.walls.reduce((sum, w) => sum + w.length, 0);
    const sheetsNeeded = Math.ceil(totalWallLength / SHEET_WIDTH);
    const key = `${room.sheetHeight * 1000}x1200`; // e.g., 2400x1200
    sheetCounts[key] = (sheetCounts[key] || 0) + sheetsNeeded;
  });

  // Calculate Materials Estimates
  const totalSheets = Object.values(sheetCounts).reduce((sum, count) => sum + count, 0);
  const tapeRolls = Math.ceil(totalSheets / 20);
  const baseBuckets = Math.ceil(totalSheets / 30);
  const topBuckets = Math.ceil(totalSheets / 30);
  const screwBoxes = Math.ceil(totalSheets * 50 / 500); // Assuming 50 screws per sheet

  // Update UI
  let summaryHTML = '<ul class="list-disc pl-5">';
  for (const [size, count] of Object.entries(sheetCounts)) {
    summaryHTML += `<li>${size} – ${count} sheets</li>`;
  }
  summaryHTML += `</ul>
    <p>Wall Tape: ${tapeRolls} Rolls</p>
    <p>Base Coat: ${baseBuckets} Buckets (20kg)</p>
    <p>Top Coat: ${topBuckets} Buckets (20kg)</p>
    <p>Screws: ${screwBoxes} Boxes</p>`;

  materialsSummary.innerHTML = summaryHTML;
}

// === Email Logic ===
const recipientType = document.getElementById('recipientType');
const recipientDropdown = document.getElementById('recipientDropdown');
const sendEmailBtn = document.getElementById('sendEmailBtn');

recipientType.addEventListener('change', loadRecipients);

async function loadRecipients() {
  const type = recipientType.value;
  recipientDropdown.innerHTML = '<option value="">Select Recipient</option>';
  if (!type) return;

  const userEmail = sessionStorage.getItem('askkaiUser');
  const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  const column = type === 'contacts' ? 'saved_contacts' : 'saved_suppliers';
  const { data, error } = await supabaseClient
    .from('users')
    .select(column)
    .eq('email', userEmail)
    .single();

  if (error) {
    alert('Error loading recipients.');
    return;
  }

  if (data && data[column]) {
    data[column].forEach(contact => {
      const option = document.createElement('option');
      option.value = contact.email;
      option.textContent = `${contact.name} (${contact.email})`;
      recipientDropdown.appendChild(option);
    });
  }
}

sendEmailBtn.addEventListener('click', () => {
  const recipient = recipientDropdown.value;
  if (!recipient) return alert('Please select a recipient.');

  const subject = encodeURIComponent("Plasterboard Materials Order from Kaymar Construction");
  const body = encodeURIComponent(materialsSummary.innerText + `\n\nRegards,\n${getUserName()}`);
  window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
});

function getUserName() {
  const email = sessionStorage.getItem('askkaiUser');
  return email ? email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1) : 'User';
}

