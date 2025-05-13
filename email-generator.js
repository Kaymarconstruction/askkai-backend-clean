const SUPABASE_URL = 'https://ndvmxpkoyoimibntetef.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Use your full key here
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

document.getElementById('submitPrompt').addEventListener('click', async () => {
  const userInput = emailInput.value.trim();
  if (!userInput) return;

  messages.push({ role: "user", content: userInput });
  chatHistory.innerHTML += `<div><strong>You:</strong> ${userInput}</div>`;
  emailInput.value = '';
  chatHistory.innerHTML += `<div><strong>Kai:</strong> Crafting your draft...</div>`;
  chatHistory.scrollTop = chatHistory.scrollHeight;

  try {
    const response = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, userEmail: userId })
    });

    const data = await response.json();
    const reply = data.reply || "Kai couldn’t generate an email. Try again.";

    messages.push({ role: "assistant", content: reply });
    chatHistory.lastChild.innerHTML = `<strong>Kai:</strong> ${reply}`;
    finalDraft.innerText = reply;

  } catch (error) {
    console.error("Error generating email:", error);
    chatHistory.innerHTML += `<div class="text-red-600 mt-4">Error: Unable to generate email at this time.</div>`;
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

  if (error || !data || !data[column]) return;

  data[column].forEach(contact => {
    const option = document.createElement('option');
    option.value = contact.email;
    option.textContent = `${contact.name} (${contact.email})`;
    recipientDropdown.appendChild(option);
  });
}

document.getElementById('sendEmailBtn').addEventListener('click', () => {
  const recipient = recipientDropdown.value;
  const draft = finalDraft.innerText;

  if (!recipient) return alert('Please select a recipient.');
  if (!draft) return alert('No draft generated.');

  const subject = encodeURIComponent("Project Update from Kaymar Construction");
  const body = encodeURIComponent(draft);
  window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
});

document.getElementById('saveDraftBtn').addEventListener('click', async () => {
  const draft = finalDraft.innerText;
  if (!draft) return alert('No draft to save.');

  const { data: currentUser, error: userError } = await supabase
    .from('users')
    .select('saved_emails')
    .eq('id', userId)
    .single();

  if (userError) return alert('Error retrieving user data.');

  const updatedDrafts = currentUser.saved_emails || [];
  updatedDrafts.push({ draft, created_at: new Date().toISOString() });

  const { error } = await supabase
    .from('users')
    .update({ saved_emails: updatedDrafts })
    .eq('id', userId);

  if (error) return alert('Error saving draft.');
  alert('Draft saved successfully!');
});

window.addEventListener('load', loadRecipients);
