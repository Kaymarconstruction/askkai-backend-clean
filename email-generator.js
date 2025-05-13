const SUPABASE_URL = 'https://ndvmxpkoyoimibntetef.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kdm14cGtveW9pbWlibnRldGVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1MDgxODksImV4cCI6MjA2MjA';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let messages = [
  {
    role: "system",
    content: "You are Kai Marlow, a seasoned Aussie tradie and master communicator. You help blokes write clear, professional, and friendly emails without the fluff. Keep it casual but respectful, suitable for clients, suppliers, or contractors. If the user asks for a draft, create it using Aussie spelling and construction lingo. Always keep it brief and to the point, but make sure it sounds polite and professional. If follow-up prompts are provided, adjust the draft accordingly until the user is happy. Provide the email body only, no subject lines unless asked specifically."
  }
];

const emailInput = document.getElementById('emailInput');
const emailBox = document.getElementById('emailBox');
const submitEmail = document.getElementById('submitEmail');
const sendEmailBtn = document.getElementById('sendEmailBtn');
const recipientDropdown = document.getElementById('recipientDropdown');

submitEmail.addEventListener('click', async () => {
  const userInput = emailInput.value.trim();
  if (!userInput) return;

  messages.push({ role: "user", content: userInput });

  emailBox.innerHTML += `<div class="text-gray-800 mt-4"><strong>You:</strong> ${userInput}</div>`;
  emailInput.value = '';
  emailBox.innerHTML += `<div class="text-green-600 font-medium mt-2">Kai is working on your draft...</div>`;

  try {
    const response = await fetch("https://askkai-backend-clean.onrender.com/generate-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages })
    });

    const data = await response.json();
    const reply = data.reply || "Kai couldn’t generate an email. Try again.";

    messages.push({ role: "assistant", content: reply });

    emailBox.innerHTML += `<div class="text-gray-800 mt-4"><strong>Kai:</strong> ${reply}</div>`;
    emailBox.scrollTop = emailBox.scrollHeight;

  } catch (error) {
    console.error("Error generating email:", error);
    emailBox.innerHTML += `<div class="text-red-600 mt-4">Error: Unable to generate email at this time.</div>`;
  }
});

sendEmailBtn.addEventListener('click', () => {
  const recipient = recipientDropdown.value;
  if (!recipient) return alert('Please select a recipient.');

  const latestDraft = [...messages].reverse().find(msg => msg.role === "assistant")?.content;
  if (!latestDraft) return alert('No draft generated yet.');

  const subject = encodeURIComponent("Follow-up Regarding Our Project");
  const body = encodeURIComponent(latestDraft);

  window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
});

async function loadRecipients() {
  const userId = sessionStorage.getItem('askkaiUserId');
  if (!userId) return;

  const { data, error } = await supabaseClient
    .from('users')
    .select('saved_contacts')
    .eq('id', userId)
    .single();

  if (data?.saved_contacts) {
    data.saved_contacts.forEach(contact => {
      const option = document.createElement('option');
      option.value = contact.email;
      option.textContent = `${contact.name} (${contact.email})`;
      recipientDropdown.appendChild(option);
    });
  }
}

window.addEventListener('load', loadRecipients);

