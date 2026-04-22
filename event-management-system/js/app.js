/* =========================================
   EventHub – app.js
   This file controls ALL the logic:
   - Storing events
   - Adding / deleting events
   - Registering users
   - Showing pages
   ========================================= */


/* =========================================
   DATA STORAGE
   We use localStorage = saves data in your
   browser even after you close the tab!
   ========================================= */

// Load events from browser storage (or start with empty array)
let events = JSON.parse(localStorage.getItem('eh_events')) || [];

// Load registrations from browser storage
let registrations = JSON.parse(localStorage.getItem('eh_registrations')) || [];

// Save data to browser storage
function saveData() {
  localStorage.setItem('eh_events', JSON.stringify(events));
  localStorage.setItem('eh_registrations', JSON.stringify(registrations));
}


/* =========================================
   PAGE NAVIGATION
   Shows one page at a time
   ========================================= */
function showPage(pageId) {
  // Hide ALL pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  // Show only the selected page
  document.getElementById('page-' + pageId).classList.add('active');

  // Update which nav button looks "active" (highlighted)
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');

  // If going to register page, refresh the event dropdown
  if (pageId === 'register') populateEventDropdown();

  // If going to my-events page, refresh the list
  if (pageId === 'my-events') renderMyEvents();

  // Always refresh dashboard
  if (pageId === 'dashboard') renderEvents();
}


/* =========================================
   ADD EVENT
   Reads the form, creates an event object,
   saves it, and shows it on dashboard
   ========================================= */
function addEvent() {
  // Read values from the form inputs
  const name     = document.getElementById('event-name').value.trim();
  const category = document.getElementById('event-category').value;
  const date     = document.getElementById('event-date').value;
  const time     = document.getElementById('event-time').value;
  const location = document.getElementById('event-location').value.trim();
  const seats    = parseInt(document.getElementById('event-seats').value);
  const desc     = document.getElementById('event-desc').value.trim();

  // Validation: make sure required fields are filled
  if (!name || !category || !date || !time || !location || !seats) {
    showToast('⚠️ Please fill all required fields!');
    return; // Stop the function here
  }

  // Create an event object (like a record/row)
  const newEvent = {
    id: Date.now(),          // unique ID using timestamp
    name,
    category,
    date,
    time,
    location,
    seats,
    desc,
    registeredCount: 0       // starts with 0 registrations
  };

  // Add to our events array
  events.push(newEvent);

  // Save to browser storage
  saveData();

  // Show success message
  const msg = document.getElementById('add-event-msg');
  msg.textContent = '✅ Event "' + name + '" added successfully!';
  msg.style.display = 'block';
  msg.style.background = 'rgba(61,214,140,0.15)';
  msg.style.color = '#3dd68c';

  // Clear the form fields
  document.getElementById('event-name').value     = '';
  document.getElementById('event-category').value = '';
  document.getElementById('event-date').value     = '';
  document.getElementById('event-time').value     = '';
  document.getElementById('event-location').value = '';
  document.getElementById('event-seats').value    = '';
  document.getElementById('event-desc').value     = '';

  showToast('🎉 Event added!');

  // Hide the success message after 3 seconds
  setTimeout(() => { msg.style.display = 'none'; }, 3000);

  // Refresh the dashboard stats
  updateStats();
}


/* =========================================
   RENDER EVENTS ON DASHBOARD
   Loops through events array and creates
   HTML cards for each event
   ========================================= */
function renderEvents(filteredList = null) {
  const grid  = document.getElementById('events-grid');
  const noMsg = document.getElementById('no-events-msg');

  // Use filtered list or all events
  const list = filteredList !== null ? filteredList : events;

  // If no events, show empty message
  if (list.length === 0) {
    grid.innerHTML = '';
    noMsg.style.display = 'block';
    updateStats();
    return;
  }

  noMsg.style.display = 'none';

  // Build HTML for each event card
  grid.innerHTML = list.map(ev => {
    const availableSeats = ev.seats - ev.registeredCount;
    const seatsClass = availableSeats <= 0 ? 'seats full' : 'seats';
    const seatsText  = availableSeats <= 0
      ? '🔴 Fully Booked'
      : '🟢 ' + availableSeats + ' seats available';

    // Format the date nicely
    const dateObj = new Date(ev.date + 'T' + ev.time);
    const formattedDate = dateObj.toLocaleDateString('en-IN', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    });
    const formattedTime = dateObj.toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit'
    });

    return `
      <div class="event-card">
        <div class="category-badge">${ev.category}</div>
        <h3>${ev.name}</h3>
        <div class="meta">
          <span>📅 ${formattedDate} at ${formattedTime}</span>
          <span>📍 ${ev.location}</span>
        </div>
        ${ev.desc ? `<p class="desc">${ev.desc}</p>` : ''}
        <p class="${seatsClass}">${seatsText}</p>
        <button class="btn-delete" onclick="deleteEvent(${ev.id})">🗑️ Delete Event</button>
      </div>
    `;
  }).join('');

  updateStats();
}


/* =========================================
   DELETE EVENT
   Removes an event and all its registrations
   ========================================= */
function deleteEvent(eventId) {
  // Ask user to confirm before deleting
  if (!confirm('Are you sure you want to delete this event?')) return;

  // Remove the event from the array
  events = events.filter(ev => ev.id !== eventId);

  // Also remove all registrations for this event
  registrations = registrations.filter(r => r.eventId !== eventId);

  // Save and refresh
  saveData();
  renderEvents();
  showToast('🗑️ Event deleted.');
}


/* =========================================
   FILTER EVENTS (Search & Category)
   ========================================= */
function filterEvents() {
  const searchText = document.getElementById('search-input').value.toLowerCase();
  const category   = document.getElementById('filter-category').value;

  const filtered = events.filter(ev => {
    // Check if name or location matches search text
    const matchesSearch = ev.name.toLowerCase().includes(searchText) ||
                          ev.location.toLowerCase().includes(searchText);

    // Check if category matches
    const matchesCategory = category === 'all' || ev.category === category;

    return matchesSearch && matchesCategory;
  });

  renderEvents(filtered);
}


/* =========================================
   REGISTER FOR EVENT
   Saves a registration entry
   ========================================= */
function registerForEvent() {
  const eventId = parseInt(document.getElementById('reg-event').value);
  const name    = document.getElementById('reg-name').value.trim();
  const email   = document.getElementById('reg-email').value.trim();
  const phone   = document.getElementById('reg-phone').value.trim();

  // Validation
  if (!eventId || !name || !email) {
    showToast('⚠️ Please fill all required fields!');
    return;
  }

  // Basic email format check
  if (!email.includes('@')) {
    showToast('⚠️ Please enter a valid email!');
    return;
  }

  // Find the selected event
  const ev = events.find(e => e.id === eventId);
  if (!ev) { showToast('Event not found!'); return; }

  // Check if seats are available
  if (ev.registeredCount >= ev.seats) {
    showToast('😔 Sorry, this event is fully booked!');
    return;
  }

  // Check if this email already registered for this event
  const alreadyRegistered = registrations.some(
    r => r.eventId === eventId && r.email === email
  );
  if (alreadyRegistered) {
    showToast('⚠️ This email is already registered for this event!');
    return;
  }

  // Create registration record
  const reg = {
    id: Date.now(),
    eventId,
    eventName: ev.name,
    name,
    email,
    phone,
    registeredAt: new Date().toLocaleString('en-IN')
  };

  // Add registration
  registrations.push(reg);

  // Increase the event's registered count
  ev.registeredCount++;

  // Save everything
  saveData();

  // Show success message
  const msg = document.getElementById('reg-msg');
  msg.textContent = '🎟️ ' + name + ', you are registered for "' + ev.name + '"!';
  msg.style.display = 'block';
  msg.style.background = 'rgba(61,214,140,0.15)';
  msg.style.color = '#3dd68c';

  // Clear form
  document.getElementById('reg-name').value  = '';
  document.getElementById('reg-email').value = '';
  document.getElementById('reg-phone').value = '';
  document.getElementById('reg-event').value = '';

  showToast('✅ Registration successful!');
  updateStats();

  setTimeout(() => { msg.style.display = 'none'; }, 4000);
}


/* =========================================
   POPULATE EVENT DROPDOWN
   Fills the register page's event selector
   ========================================= */
function populateEventDropdown() {
  const select = document.getElementById('reg-event');

  // Filter only events with available seats
  const available = events.filter(ev => ev.registeredCount < ev.seats);

  if (available.length === 0) {
    select.innerHTML = '<option value="">-- No Events Available --</option>';
    return;
  }

  select.innerHTML = '<option value="">-- Choose an Event --</option>' +
    available.map(ev =>
      `<option value="${ev.id}">${ev.name} (${ev.date})</option>`
    ).join('');
}


/* =========================================
   RENDER MY EVENTS PAGE
   Shows all events with their registrations
   ========================================= */
function renderMyEvents() {
  const container = document.getElementById('my-events-list');

  if (events.length === 0) {
    container.innerHTML = '<p style="color:var(--muted); text-align:center; padding:40px 0;">No events yet. Add one first!</p>';
    return;
  }

  container.innerHTML = events.map(ev => {
    // Find all registrations for this event
    const evRegs = registrations.filter(r => r.eventId === ev.id);

    const regRows = evRegs.length > 0
      ? evRegs.map((r, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${r.name}</td>
            <td>${r.email}</td>
            <td>${r.phone || '—'}</td>
            <td>${r.registeredAt}</td>
          </tr>
        `).join('')
      : '';

    return `
      <div class="event-block">
        <div class="event-block-header">
          <h3>🎪 ${ev.name} <small style="color:var(--muted); font-size:0.85rem;">${ev.date} · ${ev.location}</small></h3>
          <span class="badge">${ev.registeredCount}/${ev.seats} registered</span>
        </div>
        ${evRegs.length > 0
          ? `<table class="reg-table">
              <thead>
                <tr>
                  <th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Registered At</th>
                </tr>
              </thead>
              <tbody>${regRows}</tbody>
            </table>`
          : '<p class="no-reg">No registrations yet for this event.</p>'
        }
      </div>
    `;
  }).join('');
}


/* =========================================
   UPDATE STATS (Dashboard counters)
   ========================================= */
function updateStats() {
  document.getElementById('total-events').textContent = events.length;

  // Count upcoming events (date >= today)
  const today = new Date().toISOString().split('T')[0];
  const upcoming = events.filter(ev => ev.date >= today).length;
  document.getElementById('upcoming-count').textContent = upcoming;

  // Total registrations
  document.getElementById('registered-count').textContent = registrations.length;
}


/* =========================================
   TOAST NOTIFICATION
   Shows a small popup message at the bottom
   ========================================= */
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');

  // Auto hide after 3 seconds
  setTimeout(() => { toast.classList.remove('show'); }, 3000);
}


/* =========================================
   INITIALIZE APP
   Runs when the page first loads
   ========================================= */
function init() {
  renderEvents();   // Show events on dashboard
  updateStats();    // Update the stat numbers
}

// Start the app!
init();
