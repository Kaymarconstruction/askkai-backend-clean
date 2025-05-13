const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let messages = [];
const userId = sessionStorage.getItem('askkaiUserId'); 

document.getElementById('submitEmail').addEventListener('click', () => handlePrompt());

async function handlePrompt() {
  const input = document.getElementById('emailInput').value.trim();
  const emailBox = document.getElementById('emailBox');
  if (!input) return;

  messages.push({ role: 'user', content: input });
  emailBox.innerHTML = `<span class="text-green-600 font-medium">Kai is working on it...</span>`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}` // Secure via backend if possible
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: "You are Kai Marlow, a seasoned Aussie tradie and master communicator. You help blokes write clear, professional, and friendly emails without the fluff. Keep it casual but respectful, suitable for clients, suppliers, or contractors. If the user asks for a draft, create it using Aussie spelling and construction lingo. Always keep it brief and to the point, but make sure it sounds polite and professional. If follow-up prompts are provided, adjust the draft accordingly until the user is happy. Provide the email body only, no subject lines unless asked specifically." },
          ...messages
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    const data = await response.json();
    const draft = data.choices[0].message.content;
    emailBox.textContent = draft;

    await saveDraftToSupabase(draft);
    loadRecipients(); 

  } catch (error) {
    console.error('Error generating email:', error);
    emailBox.innerText = 'Kai hit a snag. Try again.';
  }
}

async function saveDraftToSupabase(draft) {
  if (!userId) return;

  const { error } = await supabase
    .from('users')
    .update({
      saved_emails: supabase.literal(`COALESCE(saved_emails, '[]'::jsonb) || '${JSON.stringify([{ draft, timestamp: new Date() }])}'::jsonb`)
    })
    .eq('id', userId);

  if (error) console.error('Failed to save draft:', error);
}

async function loadRecipients() {
  const { data, error } = await supabase
    .from('users')
    .select('saved_contacts, saved_suppliers')
    .eq('id', userId)
    .single();

  const dropdown = document.getElementById('recipientDropdown');
  dropdown.innerHTML = '<option value="">Select Recipient</option>';

  if (data?.saved_contacts) {
    data.saved_contacts.forEach(contact => {
      dropdown.innerHTML += `<option value="${contact.email}">${contact.name}</option>`;
    });
  }

  if (data?.saved_suppliers) {
    data.saved_suppliers.forEach(supplier => {
      dropdown.innerHTML += `<option value="${supplier.email}">${supplier.name}</option>`;
    });
  }
}

document.getElementById('sendEmailBtn').addEventListener('click', () => {
  const recipientEmail = document.getElementById('recipientDropdown').value;
  const draft = document.getElementById('emailBox').innerText;

  if (!recipientEmail) return alert('Select a recipient.');
  if (!draft) return alert('No email draft to send.');

  const subject = encodeURIComponent('Regarding Our Recent Work');
  const body = encodeURIComponent(`${draft}\n\nCheers,\n[Your Name]`);
  
  window.location.href = `mailto:${recipientEmail}?subject=${subject}&body=${body}`;
});
