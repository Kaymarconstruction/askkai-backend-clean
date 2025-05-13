// Configuration
const SUPABASE_URL = 'https://ndvmxpkoyoimibntetef.supabase.co';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY'; // TODO: Replace securely in production.
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const BACKEND_URL = 'https://askkai-backend-clean.onrender.com';

// User Session Check
const userId = sessionStorage.getItem('askkaiUserId');
const userEmail = sessionStorage.getItem('askkaiUser');
if (!userId || !userEmail) window.location.href = 'signin.html';

// DOM Elements
const emailInput = document.getElementById('emailInput');
const chatHistory = document.getElementById('chatHistory');
const finalDraft = document.getElementById('finalDraft');
const recipientType = document.getElementById('recipientType');
const recipientDropdown = document.getElementById('recipientDropdown');
const feedbackMessage = document.getElementById('feedbackMessage');
const loadingIndicator = document.getElementById('loading');
const submitPromptBtn = document.getElementById('submitPrompt');

// Message State
let messages = [{
  role: "system",
  content: `You are Kai Marlow, a seasoned Aussie tradie and master communicator. 
You help blokes write clear, professional, and friendly emails without the fluff. 
Keep it casual but respectful, suitable for clients, suppliers, or contractors. 
If the user asks for a draft, create it using Aussie spelling and construction lingo. 
Always keep it brief and to the point, but make sure it sounds polite and professional. 
Provide the email body only, no subject lines unless asked specifically.`
}];

// Input Event Listener
emailInput.addEventListener('input', () => {
  submitPromptBtn.disabled = emailInput.value.trim() === '';
});

submitPromptBtn.addEventListener('click', async () => {
  const userInput = emailInput.value.trim();
  if (!userInput) return;

  showLoading(true);
  messages.push({ role: "user", content: userInput });

  appendChatMessage('You', userInput);
  emailInput.value = '';
  appendChatMessage('Kai', 'Crafting your draft...');

  try {
    const response = await fetch(`${BACKEND_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, userEmail })
    });

    const data = await response.json();
    const reply = data.reply || "Kai couldn’t generate an email. Try again.";
    messages.push({ role: "assistant", content: reply });

    updateLastKaiMessage(reply);
    finalDraft.innerText = reply;
    showFeedback('Draft generated successfully.', 'success');
  } catch (error) {
    console.error("Chat Error:", error);
    updateLastKaiMessage("Kai ran into an issue. Please try again.");
    showFeedback('Failed to generate draft. Please try again.', 'error');
  } finally {
    showLoading(false);
  }
});

// Load Recipients
recipientType.addEventListener('change', loadRecipients);

async function loadRecipients() {
  const type = recipientType.value;
  recipientDropdown.innerHTML = '<option value="">Select Recipient</option>';
  if (!type) return;

  const column = type === 'contacts' ? 'saved_contacts' : 'saved_suppliers';
  const { data, error } = await supabase
    .from('users')
    .select(column)
    .eq('id', userId)
    .single();

  if (error) {
    showFeedback('Error loading recipients.', 'error');
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

// Send Email
document.getElementById('sendEmailBtn').addEventListener('click', () => {
  const recipient = recipientDropdown.value;
  const draft = finalDraft.innerText;

  if (!recipient) return showFeedback('Please select a recipient.', 'error');
  if (!draft) return showFeedback('No draft generated.', 'error');

  const subject = encodeURIComponent("Project Update from Kaymar Construction");
  const body = encodeURIComponent(draft);
  window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
});

// Save Draft
document.getElementById('saveDraftBtn').addEventListener('click', async () => {
  const draft = finalDraft.innerText;
  if (!draft) return showFeedback('No draft to save.', 'error');

  try {
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('saved_emails')
      .eq('id', userId)
      .single();

    if (userError) throw new Error('Error retrieving user data.');

    const updatedDrafts = currentUser.saved_emails || [];
    updatedDrafts.push({ draft, created_at: new Date().toISOString() });

    const { error } = await supabase
      .from('users')
      .update({ saved_emails: updatedDrafts })
      .eq('id', userId);

    if (error) throw new Error('Error saving draft.');
    showFeedback('Draft saved successfully.', 'success');
  } catch (err) {
    console.error(err);
    showFeedback('Failed to save draft.', 'error');
  }
});

window.addEventListener('load', loadRecipients);

// Utility Functions
function appendChatMessage(sender, message) {
  const msgHTML = `<div><strong>${sender}:</strong> ${message}</div>`;
  chatHistory.innerHTML += msgHTML;
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

function updateLastKaiMessage(message) {
  const kaiMessages = chatHistory.querySelectorAll('div');
  const lastKaiMsg = kaiMessages[kaiMessages.length - 1];
  if (lastKaiMsg) lastKaiMsg.innerHTML = `<strong>Kai:</strong> ${message}`;
}

function showFeedback(message, type) {
  feedbackMessage.classList.remove('hidden');
  feedbackMessage.textContent = message;
  feedbackMessage.className = `text-center text-sm p-2 rounded-lg ${type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`;
  setTimeout(() => feedbackMessage.classList.add('hidden'), 3000);
}

function showLoading(show) {
  loadingIndicator.classList.toggle('hidden', !show);
}
