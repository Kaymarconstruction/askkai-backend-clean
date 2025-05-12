function roundUp(n) {
  return Math.ceil(n);
}

function calculateDeckingMaterials() {
  const width = parseFloat(document.getElementById('deckWidth').value);
  const length = parseFloat(document.getElementById('deckLength').value);
  const height = parseFloat(document.getElementById('deckHeight').value);
  const boardWidth = parseFloat(document.getElementById('boardWidth').value);
  const boardGap = parseFloat(document.getElementById('boardGap').value);
  const boardLength = parseFloat(document.getElementById('boardLength').value);
  const joistSpacing = parseInt(document.getElementById('joistSpacing').value);
  const bearerSpacing = parseFloat(document.getElementById('bearerSpacing').value);
  const soilType = document.getElementById('soilType').value;

  let materials = [];

  // Joists
  let joistCount = roundUp((width / (joistSpacing / 1000)) + 1);
  joistCount = roundUp(joistCount * 1.05); // Add 5% margin
  materials.push(`${joistCount}x Joists @ ${width}m`);

  // Bearers
  let bearerCount = roundUp((length / bearerSpacing) + 1);
  materials.push(`${bearerCount}x Bearers @ ${length}m`);

  // Stumps
  let embedDepth = 0.45;
  if (soilType === 'Sandy') embedDepth = 0.6;
  else if (soilType === 'Loose') embedDepth = 0.75;
  else if (soilType === 'Rock') embedDepth = 0.4;
  const stumpDepth = height + embedDepth;
  const stumpCount = roundUp(bearerCount * (joistCount / 2));
  materials.push(`${stumpCount}x Stumps @ ${roundUp(stumpDepth * 100) / 100}m depth`);

  // Decking Boards
  const boardsPerRow = roundUp(width * 1000 / (boardWidth + boardGap));
  const totalBoards = roundUp((boardsPerRow * length) / boardLength);
  const boardTotal = roundUp(totalBoards * 1.05); // Add 5% waste
  materials.push(`${boardTotal}x Decking Boards @ ${boardLength}m`);

  // Concrete Volume
  const holeRadius = 0.15; // 300mm diameter post hole
  const concretePerPost = Math.PI * holeRadius ** 2 * stumpDepth; // in m³
  const totalConcrete = roundUp(stumpCount * concretePerPost * 1000); // in litres
  materials.push(`${totalConcrete}L Concrete (for ${stumpCount} holes)`);

  // Fasteners (optional, 2 per joist intersection)
  const fasteners = roundUp(joistCount * boardTotal * 2);
  materials.push(`${fasteners}x Screws/Nails`);

  // Render
  document.getElementById('materialsList').innerHTML = materials.map(item => `<li>${item}</li>`).join('');
  document.getElementById('emailSection').classList.remove('hidden');

  return materials.join('\n');
}

// Trigger
const calculateBtn = document.getElementById('calculateMaterials');
if (calculateBtn) {
  calculateBtn.addEventListener('click', () => {
    calculateDeckingMaterials();
  });
}

// Email Supplier
const emailBtn = document.getElementById('emailSupplierBtn');
if (emailBtn) {
  emailBtn.addEventListener('click', () => {
    const supplierEmail = document.getElementById('supplierDropdown').value;
    if (!supplierEmail) return alert('Please select a supplier.');

    const body = calculateDeckingMaterials();
    const subject = encodeURIComponent('Decking Material Quote Request');
    const emailBody = encodeURIComponent(`Hi there,\n\nPlease provide a quote for the following materials:\n\n${body}\n\nRegards,\n[Your Name]`);
    window.location.href = `mailto:${supplierEmail}?subject=${subject}&body=${emailBody}`;
  });
}
