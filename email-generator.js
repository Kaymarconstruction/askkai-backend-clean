const SUPABASE_URL = 'https://ndvmxpkoyoimibntetef.supabase.co';
const SUPABASE_KEY = 'YOUR_FULL_ANON_KEY_HERE'; // Use your full anon key.
const BACKEND_URL = 'https://askkai-backend-clean.onrender.com';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const userId = sessionStorage.getItem('askkaiUserId');
if (!userId) window.location.href = 'signin.html';

let messages = [{
  role: "system",
  content: `You are Kai Marlow, a seasoned Aussie tradie and master communicator. 
You help blokes write clear, professional, and friendly emails without the fluff. 
Keep it casual but respectful, suitable for clients, suppliers, or contractors. 
If the user asks for a draft, create it using Aussie spelling and construction lingo. 
Always keep it brief and to the point, but make sure it sounds polite and professional. 
If follow-up prompts are provided, adjust the draft accordingly until the user is happy. 
Provide the email body only, no subject lines unless asked specifically.`
}];

const emailInput = document.getElementById('emailInput');
const chatHistory = document.getElementById('chatHistory');
const finalDraft = document.getElementById('finalDraft');
const recipientType = document.getElementById('recipientType');
const recipientDropdown = document.getElementById('recipientDropdown');

function sanitizeInput(input) {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

document.getElementById('submitPrompt').addEventListener('click', async () => {
  const userInput = emailInput.value.trim();
  if (!userInput) return;

  const safeInput = sanitizeInput(userInput);
  messages.push({ role: "user", content: userInput });

  chatHistory.innerHTML += `<div><strong>You:</strong> ${safeInput}</div>`;
  emailInput.value = '';
  const kaiPlaceholder = document.createElement('div');
  kaiPlaceholder.innerHTML = `<strong>Kai:</strong> Crafting your draft...`;
  chatHistory.appendChild(kaiPlaceholder);
  chatHistory.scrollTop = chatHistory.scrollHeight;

  try {
    const response = await fetch(`${BACKEND_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, userEmail: userId })
    });

    if (!response.ok) throw new Error(`Server Error: ${response.status}`);

    const data = await response.json();
    const reply = sanitizeInput(data.reply || "Kai couldn’t generate an email. Try again.");

    messages.push({ role: "assistant", content: reply });
    kaiPlaceholder.innerHTML = `<strong>Kai:</strong> ${reply}`;
    finalDraft.innerText = reply;

  } catch (error) {
    console.error("Error generating email:", error);
    kaiPlaceholder.innerHTML = `<strong>Kai:</strong> Error: Unable to generate email at this time.`;
  }
});

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
    console.error('Error loading recipients:', error);
    return;
  }

  (data?.[column] || []).forEach(contact => {
    const option = document.createElement('option');
    option.value = contact.email;
    option.textContent = `${contact.name} (${contact.email})`;
    recipientDropdown.appendChild(option);
  });
}

document.getElementById('sendEmailBtn').addEventListener('click', () => {
  const recipient = recipientDropdown.value;
  const draft = finalDraft.innerText.trim();

  if (!recipient) return alert('Please select a recipient.');
  if (!draft) return alert('No draft generated.');

  const subject = encodeURIComponent("Project Update from Kaymar Construction");
  const body = encodeURIComponent(draft);
  window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
});

document.getElementById('saveDraftBtn').addEventListener('click', async () => {
  const draft = finalDraft.innerText.trim();
  if (!draft) return alert('No draft to save.');

  const { data: currentUser, error: userError } = await supabase
    .from('users')
    .select('saved_emails')
    .eq('id', userId)
    .single();

  if (userError) {
    console.error('Error retrieving user data:', userError);
    return alert('Error retrieving user data.');
  }

  const updatedDrafts = Array.isArray(currentUser?.saved_emails) ? currentUser.saved_emails : [];
  updatedDrafts.push({ draft, created_at: new Date().toISOString() });

  const { error } = await supabase
    .from('users')
    .update({ saved_emails: updatedDrafts })
    .eq('id', userId);

  if (error) {
    console.error('Error saving draft:', error);
    return alert('Error saving draft.');
  }

  alert('Draft saved successfully!');
});

window.addEventListener('load', loadRecipients);
