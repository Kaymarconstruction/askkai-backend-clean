const user = sessionStorage.getItem('askkaiUser');
if (!user) window.location.href = 'signin.html';
const isMark = user === 'mark@kaymarconstruction.com';
let promptCount = parseInt(localStorage.getItem('promptCount') || '0');
const MAX_FREE_PROMPTS = 10;
const messages = [];

function toggleMenu() {
  document.getElementById('menuDropdown').classList.toggle('hidden');
}

function logoutUser() {
  sessionStorage.clear();
  localStorage.removeItem('promptCount');
  localStorage.removeItem('kaiTokens');
  window.location.href = 'logout.html';
}

document.getElementById('submitBtn').addEventListener('click', async () => {
  const askInput = document.getElementById('askInput');
  const kaiReply = document.getElementById('kaiReply');
  const userQuestion = askInput.value.trim();
  if (!userQuestion) return;

  if (!isMark && promptCount >= MAX_FREE_PROMPTS) {
    alert("You’ve hit your free limit. Time to upgrade.");
    window.location.href = 'upgrade.html';
    return;
  }

  messages.push({ role: "user", content: userQuestion });

  const qaContainer = document.createElement('div');
  qaContainer.className = 'mb-6';

  const userText = document.createElement('p');
  userText.className = 'text-right text-blue-700 font-semibold mb-2';
  userText.textContent = `You: ${userQuestion}`;
  qaContainer.appendChild(userText);

  const kaiText = document.createElement('p');
  kaiText.className = 'text-left text-green-600 font-semibold whitespace-pre-wrap';
  const cursor = document.createElement('span');
  cursor.className = 'blinking-cursor';
  kaiText.textContent = "Kai is thinking...";
  kaiText.appendChild(cursor);
  qaContainer.appendChild(kaiText);

  kaiReply.appendChild(qaContainer);
  kaiReply.scrollTop = kaiReply.scrollHeight;
  askInput.value = "";

  try {
    const response = await fetch('https://askkai-backend-clean.onrender.com/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages })
    });

    const data = await response.json();
    const finalText = data.reply || "Kai’s stumped. Try again shortly.";
    kaiText.textContent = finalText;
  } catch (error) {
    console.error('Fetch error:', error);
    kaiText.textContent = "Kai had an error. Please try again.";
  }
});
