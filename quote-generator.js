<!DOCTYPE html>  <html lang="en">  
<head>  
  <meta charset="UTF-8" />  
  <meta name="viewport" content="width=device-width, initial-scale=1.0">  
  <title>Quote Generator – Ask Kai</title>  
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">  
  <style>  
    #quoteBox { max-height: 50vh; overflow-y: auto; white-space: pre-wrap; }  
  </style>  
</head>  
<body class="bg-gray-100 text-gray-800">    <!-- Banner -->    <div class="w-full bg-black">  
    <img src="https://i.imgur.com/nDIhtRr.png" alt="Kaymar Banner" class="w-full max-h-24 object-contain mx-auto">  
  </div>    <!-- Header -->    <header class="bg-white shadow p-4 flex items-center justify-between">  
    <h1 class="text-xl font-bold text-green-600">Quote Generator</h1>  
    <a href="index.html" class="text-sm text-blue-600 hover:underline">Back to Chat</a>  
  </header>    <!-- Prompt Input -->    <main class="max-w-3xl mx-auto py-8 px-4 space-y-6">  
    <div class="bg-white p-6 rounded-xl shadow">  
      <label for="quoteInput" class="block font-semibold mb-2">  
        Describe your job in detail. <span class="text-red-600">Be very specific</span> — location, materials, sizes, etc.  
      </label>  
      <textarea id="quoteInput" rows="4" class="w-full border rounded-lg p-3"  
        placeholder="e.g. 7.2x3.6m deck, 600mm high, treated pine stumps, 140x45 double bearers, 90x45 joists, composite decking, VIC"></textarea>  
      <button id="submitQuote" class="mt-4 w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg">  
        Generate Materials List  
      </button>  
    </div>  <!-- Quote Output -->  
<div id="quoteBox" class="bg-white p-6 rounded-xl shadow text-sm text-gray-800"></div>  

<!-- Email Export -->  
<div id="emailExport" class="hidden bg-white p-6 rounded-xl shadow">  
  <label class="block text-sm font-semibold mb-2">Select a supplier to email this quote:</label>  
  <select id="supplierSelect" class="w-full mb-4 border p-2 rounded"></select>  
  <button id="emailSupplierBtn"  
    class="bg-black text-white px-4 py-2 rounded hover:bg-gray-900 transition">Email Supplier</button>  
</div>  

<!-- Export Disclaimer -->  
<div class="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded shadow">  
  <p>This estimate is for materials only. Always confirm with your supplier or engineer before purchasing.</p>  
</div>

  </main>    <!-- Footer -->    <footer class="text-center text-gray-500 text-sm p-6">  
    &copy; 2025 Kaymar Construction | Powered by Ask Kai  
    <div class="flex justify-center space-x-6 mt-2">  
      <a href="https://www.instagram.com/askkai_official" class="text-blue-600 hover:underline">Instagram</a>  
      <a href="https://www.tiktok.com/@askkai_official" class="text-blue-600 hover:underline">TikTok</a>  
      <a href="https://www.facebook.com/askkai_official" class="text-blue-600 hover:underline">Facebook</a>  
      <a href="https://www.youtube.com/@askkai_official" class="text-blue-600 hover:underline">YouTube</a>  
      <a href="https://www.threads.net/@askkai_official" class="text-blue-600 hover:underline">Threads</a>  
    </div>  
  </footer>    <!-- JS -->    <script>  
    let generatedQuote = '';  
  
    window.addEventListener('DOMContentLoaded', () => {  
      const stored = localStorage.getItem('supplierEmails') || '';  
      const suppliers = stored.split('\n').map(e => e.trim()).filter(Boolean);  
      const select = document.getElementById('supplierSelect');  
  
      const defaultOpt = document.createElement('option');  
      defaultOpt.value = '';  
      defaultOpt.textContent = '-- Choose Supplier Email --';  
      select.appendChild(defaultOpt);  
  
      suppliers.forEach(email => {  
        const opt = document.createElement('option');  
        opt.value = email;  
        opt.textContent = email;  
        select.appendChild(opt);  
      });  
    });  
  
    document.getElementById('submitQuote').addEventListener('click', async () => {  
      const input = document.getElementById('quoteInput').value.trim();  
      const quoteBox = document.getElementById('quoteBox');  
      const emailExport = document.getElementById('emailExport');  
      if (!input) return;  
  
      quoteBox.innerHTML = "<span class='text-green-600 font-medium'>Kai is generating your materials list...</span>";  
      emailExport.classList.add('hidden');  
  
      const response = await fetch("https://askkai-backend-clean.onrender.com/quote", {  
        method: "POST",  
        headers: { "Content-Type": "application/json" },  
        body: JSON.stringify({ messages: [ { role: "user", content: input } ] })  
      });  
  
      const data = await response.json();  
      let reply = data.reply || "Kai couldn’t generate a quote. Try again.";  
  
      reply = reply  
        .replace(/^(Absolutely.*?)?(Here's|Here is).*?estimate.*?:\n?/is, '')  
        .replace(/\n?This estimate is for materials only\..*$/is, '')  
        .trim();  
  
      generatedQuote = reply;  
      quoteBox.textContent = reply;  
      if (reply.length > 10) {  
        emailExport.classList.remove('hidden');  
      }  
    });  
  
    document.getElementById('emailSupplierBtn').addEventListener('click', () => {  
      const supplierEmail = document.getElementById('supplierSelect').value;  
      if (!supplierEmail) return alert('Please select a supplier.');  
  
      const subject = encodeURIComponent("Material Quote Request");  
      const body = encodeURIComponent(`Hi [Rep's Name or Supplier Name],\n\nHope you're well.\n\nI’m putting together a quote for a client and need pricing on the following materials:\n\nJob Location: [Suburb or address if relevant]\nRequired Materials:\n\n${generatedQuote}\n\nIf you could send through availability and pricing (inc. GST and delivery if possible), that’d be appreciated. Keen to lock this one in ASAP.\n\nLet me know if you need any more info.\n\nCheers,\n[Your Name]`);  
  
      const mailto = `mailto:${supplierEmail}?subject=${subject}&body=${body}`;  
      window.location.href = mailto;  
    });  
  </script>  </body>  
</html>
