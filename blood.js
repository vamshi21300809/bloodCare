window.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "http://localhost:5000";
  const bloodCompat = {
    'A+':  { donateTo: ['A+','AB+'], receiveFrom: ['A+','A-','O+','O-'], note: 'A+ is the second most common blood type. You can donate to A+ and AB+ recipients.' },
    'A-':  { donateTo: ['A+','A-','AB+','AB-'], receiveFrom: ['A-','O-'], note: 'A- is a rare and valuable type. You can donate to all A and AB recipients.' },
    'B+':  { donateTo: ['B+','AB+'], receiveFrom: ['B+','B-','O+','O-'], note: 'B+ can donate to B+ and AB+ patients. B+ donors are especially needed in South Asian communities.' },
    'B-':  { donateTo: ['B+','B-','AB+','AB-'], receiveFrom: ['B-','O-'], note: 'B- is rare but very versatile — you can donate to all B and AB recipients.' },
    'AB+': { donateTo: ['AB+'], receiveFrom: ['A+','A-','B+','B-','AB+','AB-','O+','O-'], note: 'AB+ is the Universal Recipient — you can receive blood from any blood type!' },
    'AB-': { donateTo: ['AB+','AB-'], receiveFrom: ['A-','B-','AB-','O-'], note: 'AB- donors are Universal Plasma Donors. Your plasma can be given to anyone.' },
    'O+':  { donateTo: ['A+','B+','O+','AB+'], receiveFrom: ['O+','O-'], note: 'O+ is the most common type. You can donate to all positive blood types — that\'s over 80% of people!' },
    'O-':  { donateTo: ['A+','A-','B+','B-','AB+','AB-','O+','O-'], receiveFrom: ['O-'], note: 'O- is the Universal Donor! Your blood can be given to anyone in an emergency. O- donors are critically needed.' },
  };

  let donors = [];
  function showPage(name) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById('page-' + name);
    if (page){ 
      page.classList.add('active');
    }
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    const navEl = document.getElementById('nav-' + name);
    if (navEl) {
      navEl.classList.add('active');
    }
    const navLinks = document.getElementById('navLinks');
    if (navLinks){
      navLinks.classList.remove('open');
    }
    window.scrollTo(0,0);
    if (name === 'donors'){
      renderTable();
    }
  }
  function toggleNav() {
  const navLinks = document.getElementById('navLinks');
    if (navLinks) {
      navLinks.classList.toggle('open');
    }
  }
  
  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
  }
  
  function getAge(dob) {
    if (!dob) {
      return '?';
    }
    const b = new Date(dob);
    if (isNaN(b)) {
      return '?';
    }
    const n = new Date();
    let age = n.getFullYear() - b.getFullYear();
    const m = n.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && n.getDate() < b.getDate())) {
      age--;
    }
    return age;
  }

  async function registerDonor() {
    document.getElementById('resultChecklist').style.display = 'none';
    const fname = document.getElementById('fname').value.trim();
    const lname = document.getElementById('lname').value.trim();
    const dob = document.getElementById('dob').value;
    const gender = document.getElementById('gender').value;
    const blood = document.getElementById('bloodtype').value;
    const weight = parseInt(document.getElementById('weight').value);
    const phone = document.getElementById('phone').value.trim().replace(/\s+/g, '');
    const city = document.getElementById('city').value.trim();
    const lastDonate = document.getElementById('lastdonate').value;
    const notes = document.getElementById('notes').value.trim();
    const email = document.getElementById('email').value;
    if (!fname || !lname || !dob || !gender || !blood || !city || isNaN(weight) || !/^\d{10}$/.test(phone)){
      showToast('⚠ Please fill all required fields');
      return;
    }
    let url = API_BASE + '/donors';
    let method = "POST";
    if (window.editingId) {
      url = API_BASE + '/donors/' + window.editingId;
      method = "PUT";
    }
    try {
      const res = await fetch(url, {
        method,
        headers: {
        "Content-Type": "application/json",
        "Authorization": "Basic " + localStorage.getItem("auth")
        },
        body: JSON.stringify({
          fname,
          lname,
          blood,
          dob,
          city,
          phone,
          lastDonate,
          notes,
          gender,
          weight,
          email
        })
      });
      if (!res.ok) {
        let err = {};
        try {
          err = await res.json();
        } 
        catch {}
        showToast(err.error || "❌ Server error");
        return;
      }
      let data = await res.json();
        showToast("✅ Donor registered successfully!");
      clearForm();
      loadDonors();
    } 
    catch (err) {
      showToast("❌ Network error");
    }
  }
  
  function clearForm() {
    ['fname','lname','dob','gender','bloodtype','weight','phone','email','city','lastdonate','notes']
    .forEach(id => { 
      const el = document.getElementById(id); if(el) el.value = ''; 
    });
  }
  
  function renderTable() {
    const search = (document.getElementById('searchDonor').value || '').toLowerCase();
    const filter = document.getElementById('filterBlood').value;
    const today = new Date();
    const tbody = document.getElementById('donorTableBody');
    const filtered = donors.filter(d => {
      const name = (d.fname + ' ' + d.lname).toLowerCase();
      const matchSearch = name.includes(search) ||(d.city || "").toLowerCase().includes(search);
      const matchBlood = !filter || d.blood === filter;
      return matchSearch && matchBlood;
    });
    tbody.innerHTML = filtered.map((d, i) => {
      const age = d.dob !== '' ? getAge(d.dob) : '?';
      let status = 'Available', statusClass = 'badge-green';
      if (d.lastDonate) {
        const last = new Date(d.lastDonate);
        const days = Math.floor((today - last) / (1000*60*60*24));
        if (days < 56) { 
          status = 'Waiting (' + (56-days) + 'd)'; statusClass = 'badge-yellow'; 
        }
      }
      return `<tr>
        <td style="color:var(--gray)">${i+1}</td>
        <td><strong>${d.fname} ${d.lname}</strong></td>
        <td><span class="badge badge-red">${d.blood}</span></td>
        <td>${age}</td>
        <td>${d.city}</td>
        <td><a href="tel:${d.phone}" style="color:var(--red); text-decoration:none;">${d.phone}</a></td>
        <td style="color:var(--gray); font-size:0.8rem;">${d.lastDonate || 'Never'}</td>
        <td><span class="badge ${statusClass}">${status}</span></td>
        <td><span style="color:green;">View Only</span></td>
      </tr>`;
    }).join('') || `<tr><td colspan="9" style="text-align:center; padding:40px; color:var(--gray);">No donors found.</td></tr>`;
  }

  async function login() {
    const username = document.getElementById('loginUser').value.trim();
    const password = document.getElementById('loginPass').value.trim();
    try {
      const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || "❌ Login failed");
        return;
      }
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("auth", btoa(username + ":" + password));
      showToast("✅ Login successful");
      showPage("donors");
    } 
    catch (err) {
      showToast("❌ Network error");
    }
  }
  
  function logout() {
    localStorage.removeItem("isLoggedIn");
    showToast("👋 Logged out successfully");
    showPage('home');
  }

  let logoutTimer;
  const AUTO_LOGOUT_TIME = 5 * 60 * 1000;
  function startAutoLogout() {
    resetLogoutTimer();
    document.addEventListener("click", resetLogoutTimer);
    document.addEventListener("keypress", resetLogoutTimer);
  }

  let warningTimer;
  function resetLogoutTimer() {
    clearTimeout(logoutTimer);
    clearTimeout(warningTimer);
    warningTimer = setTimeout(() => {
      showToast("⚠️ Session will expire in 1 minute...");
    }, AUTO_LOGOUT_TIME - 60000);
    logoutTimer = setTimeout(() => {
      localStorage.removeItem("isLoggedIn");
      showToast("⏱️ Session expired. Logged out.");
      showPage("login");
    }, AUTO_LOGOUT_TIME);
  }

  if (localStorage.getItem("isLoggedIn") === "true") {
    startAutoLogout();
  }

  function checkEligibility() {
    const age = parseInt(document.getElementById('eli-age').value) || 0;
    const weight = parseInt(document.getElementById('eli-weight').value) || 0;
    const lastDonate = parseInt(document.getElementById('eli-lastdonate').value) || 0;
    const meds = document.getElementById('eli-meds').value;
    const illness = document.getElementById('eli-illness').value;
    const tattoo = document.getElementById('eli-tattoo').value;
  
    if (age === 0|| weight === 0) {
      document.getElementById('resultTitle').textContent = "Fill all fields";
      document.getElementById('resultMsg').textContent = "Please enter age and weight.";
      document.getElementById('resultIcon').innerHTML = "❗";
      return;
    }
    const checks = [];
    let eligible = true;
    let warnings = 0;

    if (age) {
      const ageOk = age >= 17 && age <= 65;
      checks.push({ 
        label: 'Age ' + age + (ageOk ? ' (eligible range 17-65)' : ' (must be 17-65)'), pass: ageOk ? 'pass' : 'fail' 
      });
      if (!ageOk) {
        eligible = false;
      }
    }
  
    if (weight) {
      const wOk = weight >= 50;
      checks.push({ 
        label: 'Weight ' + weight + 'kg ' + (wOk ? '(min 50kg)' : '(too low, min 50kg)'), pass: wOk ? 'pass' : 'fail' 
      });
      if (!wOk) {
        eligible = false;
      }
    }
  
    if (!isNaN(lastDonate) && document.getElementById('eli-lastdonate').value !== '') {
      if (lastDonate === 0) {
        checks.push({ 
          label: 'First-time donor — welcome!', pass: 'pass' 
        });
      } 
      else {
        const weeksAgo = lastDonate * 4.33;
        const ok = weeksAgo >= 8;
        checks.push({ 
          label: 'Last donation ' + lastDonate + ' months ago ' + (ok ? '(8 weeks elapsed ✓)' : '(wait 8 weeks from last donation)'), pass: ok ? 'pass' : 'fail' 
        });
        if (!ok) {
          eligible = false;
        } 
      }
    }
  
    if (meds) {
      if (meds === 'major') {
        checks.push({ 
          label: 'Prescription medication — consult doctor', pass: 'warn' 
        });
        warnings++;
      } else if (meds === 'minor') {
        checks.push({ 
          label: 'Minor vitamins/supplements — generally fine', pass: 'pass' 
        });
      } else {
        checks.push({ 
          label: 'No current medications', pass: 'pass' 
        });
      }
    }
  
    if (illness) {
      if (illness === 'hiv') {
        checks.push({ 
          label: 'HIV/AIDS or Hepatitis — not eligible to donate', pass: 'fail' 
        });
        eligible = false;
      } else if (illness === 'chronic') {
        checks.push({ 
          label: 'Chronic condition — requires medical clearance', pass: 'warn' 
        });
        warnings++;
      } else if (illness === 'cold') {
        checks.push({ 
          label: 'Active illness — wait until fully recovered', pass: 'fail' 
        });
        eligible = false;
      } else {
        checks.push({ 
          label: 'No major illness', pass: 'pass' 
        });
      }
    }
  
    if (tattoo) {
      if (tattoo === 'yes') {
        checks.push({ 
          label: 'Recent tattoo/piercing — wait 6 months from procedure', pass: 'fail' 
        });
        eligible = false;
      } 
      else {
        checks.push({ 
          label: 'No recent tattoo or piercing', pass: 'pass' 
        });
      }
    }
  
    const icon = document.getElementById('resultIcon');
    const title = document.getElementById('resultTitle');
    const msg = document.getElementById('resultMsg');
    const list = document.getElementById('resultChecklist');

    list.style.display = 'block';
    list.innerHTML = checks.map(c => `<li><span class="check-dot ${c.pass}">${c.pass==='pass'?'✓':c.pass==='warn'?'!':'✗'}</span>${c.label}</li>`).join('');
  
    if (warnings > 0 && eligible) {
      icon.className = 'result-icon'; icon.style.background = '#FEF9E7'; icon.innerHTML = '&#9888;';
      title.textContent = 'Possibly Eligible'; title.style.color = '#B7770D';
      msg.textContent = 'You may be eligible, but please consult with a medical professional before donating.';
    } 
    else if (eligible) {
      icon.className = 'result-icon eligible'; icon.innerHTML = '&#10003;';
      title.textContent = 'You Are Eligible!'; title.style.color = '#1D8348';
      msg.textContent = 'Great news! Based on your answers, you appear eligible to donate blood. Book an appointment today.';
    } 
    else {
      icon.className = 'result-icon ineligible'; icon.innerHTML = '&#10007;';
      title.textContent = 'Not Currently Eligible'; title.style.color = '#C0392B';
      msg.textContent = 'Based on your answers, you cannot donate blood at this time. Check the reasons below and try again when conditions change.';
    }
  }

  function selectBloodType(type) {
    document.querySelectorAll('.blood-card').forEach(c => c.classList.remove('selected'));
    const cards = document.querySelectorAll('.blood-card');
    cards.forEach(card => {
      if (card.querySelector('.blood-type-label').innerText === type) {
        card.classList.add('selected');
      }
    });
    const data = bloodCompat[type];
    document.getElementById('btTitle').textContent = type + ' Blood Type';
    const dot = (t, color) =>
      `<span style="background:${color};color:white;padding:6px 14px;border-radius:20px;font-size:0.82rem;font-weight:600;">${t}</span>`;

    document.getElementById('btDonateTo').innerHTML =
      data.donateTo.map(t => dot(t,'#C0392B')).join('');

    document.getElementById('btReceiveFrom').innerHTML =
      data.receiveFrom.map(t => dot(t,'#1D8348')).join('');

    document.getElementById('btNote').textContent = data.note;

    document.getElementById('bloodTypeDetail').style.display = 'block';
    document.getElementById('bloodTypeDetail').scrollIntoView({ behavior: 'smooth' });
  }

  const chatInput = document.getElementById('chat-input');
  if (chatInput) {
    chatInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        const userMsg = chatInput.value;
        addMessage("You: " + userMsg);
        reply(userMsg.toLowerCase());
        chatInput.value = "";
      }
    });
  }
  
  const chatBody = document.getElementById('chat-body');
  function addMessage(msg) {
    const div = document.createElement('div');
    div.textContent = msg;
    if (chatBody) {
      chatBody.appendChild(div);
    }
    if (chatBody) {
      chatBody.scrollTop = chatBody.scrollHeight;
    }
  }

  function reply(msg) {
    let res = "I didn't understand 😅";

    if (msg.includes("eligibility")) {
      res = "You must be 17-65 years old and weight above 50kg.";
    } 
    else if (msg.includes("blood")) {
      res = "O- is universal donor, AB+ is universal receiver.";
    }
    else if (msg.includes("donate")) {
      res = "You can donate every 56 days.";
    }
    else if (msg.includes("hello") || msg.includes("hi")) {
      res = "Hi! How can I help you? 😊";
    }
    setTimeout(() => addMessage("Bot: " + res), 500);
  }

  const chatToggle = document.getElementById('chat-toggle');
  const chatbot = document.getElementById('chatbot');
  if (chatToggle) {
    chatToggle.onclick = () => {
      if (chatbot.style.display === "none" || chatbot.style.display === "") {
        chatbot.style.display = "block";
      } 
      else {
        chatbot.style.display = "none";
      }
    };
  }

  const chatHeader = document.getElementById('chat-header');
  if (chatHeader) {
    chatHeader.onclick = () => {
      chatbot.style.display = "none";
    };
  }

  document.querySelectorAll('a[href="#"]').forEach(a => {
    a.addEventListener('click', e => e.preventDefault());
  });


  const el = document.getElementById('nav-log');
  if (el) el.onclick = () => showPage('login');

  const urgent = document.getElementById('urgent-donate');
  if (urgent) urgent.onclick = () => showPage('donate');
  
  const navHome = document.getElementById('nav-home');
  if (navHome) navHome.onclick = () => showPage('home');
  
  const navDonate = document.getElementById('nav-donate');
  if (navDonate) navDonate.onclick = () => showPage('donate');
  
  const navDonors = document.getElementById('nav-donors');
  if (navDonors) navDonors.onclick = () => showPage('donors');
  
  const navEligibility = document.getElementById('nav-eligibility');
  if (navEligibility) navEligibility.onclick = () => showPage('eligibility');
  
  const navBloodTypes = document.getElementById('nav-blood-types');
  if (navBloodTypes) navBloodTypes.onclick = () => showPage('blood-types');
  
  const navCta = document.getElementById('nav-cta');
  if (navCta) navCta.onclick = () => showPage('donate');

  const loginBtn = document.getElementById('login');
  if (loginBtn) loginBtn.onclick = login;

  const logoutBtn = document.getElementById('logout');
  if (logoutBtn) logoutBtn.onclick = logout;
  
  const hamb = document.getElementById('hamb');
  if (hamb) hamb.onclick = toggleNav;

  const regBtn = document.getElementById('registerBtn');
  if (regBtn) regBtn.onclick = registerDonor;

  const clsBtn = document.getElementById('cls');
  if (clsBtn) clsBtn.onclick = clearForm;
  
  const aplus = document.getElementById('a_plus');
  if (aplus) aplus.onclick = () => selectBloodType('A+');
  
  const aMinus = document.getElementById('a_minus');
  if (aMinus) aMinus.onclick = () => selectBloodType('A-');
  
  const abPlus = document.getElementById('ab_plus');
  if (abPlus) abPlus.onclick = () => selectBloodType('AB+');
  
  const abMinus = document.getElementById('ab_minus');
  if (abMinus) abMinus.onclick = () => selectBloodType('AB-');
  
  const bPlus = document.getElementById('b_plus');
  if (bPlus) bPlus.onclick = () => selectBloodType('B+');
  
  const bMinus = document.getElementById('b_minus');
  if (bMinus) bMinus.onclick = () => selectBloodType('B-');
  
  const oPlus = document.getElementById('o_plus');
  if (oPlus) oPlus.onclick = () => selectBloodType('O+');
  
  const oMinus = document.getElementById('o_minus');
  if (oMinus) oMinus.onclick = () => selectBloodType('O-');
  
  const eliAge = document.getElementById('eli-age');
  if (eliAge) eliAge.oninput = checkEligibility;

  const eliWeight = document.getElementById('eli-weight');
  if (eliWeight) eliWeight.oninput = checkEligibility;

  const eliLast = document.getElementById('eli-lastdonate');
  if (eliLast) eliLast.oninput = checkEligibility;

  const meds = document.getElementById('eli-meds');
  if (meds) meds.oninput = checkEligibility;

  const illness = document.getElementById('eli-illness');
  if (illness) illness.oninput = checkEligibility;

  const tattoo = document.getElementById('eli-tattoo');
  if (tattoo) tattoo.oninput = checkEligibility;

  const search = document.getElementById('searchDonor');
  if (search) search.oninput = renderTable;

  const filter = document.getElementById('filterBlood');
  if (filter) filter.onchange = renderTable;
  
  document.querySelectorAll('.faq-q').forEach(q => {
    q.addEventListener('click', () => {
      q.parentElement.classList.toggle('open');
    });
  });

  async function loadDonors() {
    try {
    const res = await fetch(`${API_BASE}/donors`);
    if (!res.ok) {
      console.log("Server error");
      donors = [];
      return;
    }

    let data;
    try {
      data = await res.json();
    } 
    catch {
      console.log("Invalid JSON");
      donors = [];
      return;
    }

    donors = data || [];
    renderTable();
    } 
    catch (err) {
      console.log("Network error");
      donors = [];
    }
  }

  const searchEl = document.getElementById('searchDonor');
  if (searchEl) searchEl.value = '';

  loadDonors();
});