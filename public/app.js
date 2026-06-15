// Theme Management
const themeToggleBtn = document.getElementById('themeToggle');
const htmlEl = document.documentElement;
const themeIcon = themeToggleBtn.querySelector('.material-symbols-rounded');

const savedTheme = localStorage.getItem('theme') || 'dark';
htmlEl.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);

themeToggleBtn.addEventListener('click', () => {
    const currentTheme = htmlEl.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    htmlEl.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
});

function updateThemeIcon(theme) {
    themeIcon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
}

// Navigation
function navigateTo(screenId) {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
        targetScreen.scrollTop = 0;
    }
}

// Global App State
let appState = {
    currentSalonId: 'salon_1', // Default for demo
    selectedSlot: null,
    selectedService: 'Classic Haircut'
};

// ==========================
// RENDERERS & API INTEGRATION
// ==========================

// 1. User Home: Load Salons
async function loadSalons() {
    try {
        const salons = await api.getSalons();
        const listEl = document.getElementById('user-salon-list');
        listEl.innerHTML = '';
        
        salons.forEach((salon, index) => {
            const gradientClass = `gradient-${(index % 2) + 1}`;
            const tagClass = salon.status.includes('Available') ? 'tag-green' : 'tag-orange';
            
            const card = document.createElement('div');
            card.className = 'glass-card salon-card';
            card.onclick = () => {
                appState.currentSalonId = salon.id;
                navigateTo('screen-select-slot');
                loadBookingOptions(salon.id);
            };
            
            card.innerHTML = `
                <div class="salon-image ${gradientClass}"></div>
                <div class="salon-details">
                    <div class="salon-title-row">
                        <h3>${salon.name}</h3>
                        <span class="tag ${tagClass}">${salon.status}</span>
                    </div>
                    <p class="subtitle-small">${salon.rating} star &middot; ${salon.distance} &middot; from Rs 299</p>
                </div>
            `;
            listEl.appendChild(card);
        });
        addInteractionEffects(listEl.querySelectorAll('.glass-card'));
    } catch (e) {
        console.error("Error loading salons", e);
    }
}

// 2. Owner Dashboard: Load Staff and Bookings
async function loadOwnerDashboard(salonId) {
    try {
        const staff = await api.getStaff(salonId);
        const bookings = await api.getBookings(salonId);
        
        // Render Staff
        const staffListEl = document.getElementById('owner-staff-list');
        staffListEl.innerHTML = '';
        let freeCount = 0;
        
        staff.forEach(s => {
            if(s.status === 'Available') freeCount++;
            
            let tagClass = 'tag-outline';
            if(s.status === 'In Service') tagClass = 'tag-red';
            if(s.status === 'Available') tagClass = 'tag-green';
            if(s.status === 'On Break') tagClass = 'tag-orange';
            
            const card = document.createElement('div');
            card.className = 'glass-card staff-card selectable';
            card.onclick = () => openStaffModal(s.name, s.id, card);
            
            card.innerHTML = `
                <div class="avatar avatar-md gray-bg">${s.initials}</div>
                <div class="staff-info">
                    <h3>${s.name}</h3>
                    <p>${s.details}</p>
                </div>
                <span class="tag ${tagClass}">${s.status}</span>
            `;
            staffListEl.appendChild(card);
        });
        document.getElementById('owner-staff-free-count').textContent = `${freeCount} free`;
        
        // Render Bookings
        const bookingsListEl = document.getElementById('owner-bookings-list');
        if(bookingsListEl) {
            bookingsListEl.innerHTML = '';
            bookings.forEach(b => {
                const isDone = b.status === 'done';
                const card = document.createElement('div');
                card.className = `glass-card booking-item ${isDone ? 'inactive' : ''}`;
                
                const [timeStr, ampm] = b.time.split(' ');
                
                card.innerHTML = `
                    <div class="booking-time-col">
                        <span class="b-time">${timeStr}</span>
                        <span class="b-ampm">${ampm}</span>
                    </div>
                    <div class="booking-details-col">
                        <h3>${b.customerName}</h3>
                        <p>${b.service} &middot; Staff ID: ${b.staffId.split('_')[1]}</p>
                    </div>
                    <div class="booking-actions">
                        ${isDone 
                            ? `<span class="tag tag-outline">Done</span>` 
                            : `<button class="btn-icon tag-green" onclick="markBookingDone('${b.id}')"><span class="material-symbols-rounded" style="font-size: 16px;">check</span></button>`
                        }
                    </div>
                `;
                bookingsListEl.appendChild(card);
            });
        }
        
        addInteractionEffects(document.querySelectorAll('.selectable'));
    } catch (e) {
        console.error("Error loading owner dashboard", e);
    }
}

// 3. Register Salon Flow
const registerForm = document.getElementById('registration-form');
if(registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const inputs = registerForm.querySelectorAll('input');
        const activePills = registerForm.querySelectorAll('.pill.active');
        const services = Array.from(activePills).map(p => p.textContent);
        const products = registerForm.querySelector('textarea').value;
        
        const data = {
            name: inputs[0].value,
            license: inputs[1].value,
            services: services,
            products: products
        };
        
        try {
            const newSalon = await api.registerSalon(data);
            appState.currentSalonId = newSalon.id;
            
            // Switch to Owner view and load their specific dashboard
            navigateTo('screen-owner-dashboard');
            loadOwnerDashboard(newSalon.id);
            
            // Reload user salons in background so it's updated for user view
            loadSalons();
        } catch (e) {
            console.error("Failed to register", e);
        }
    });
}

// 4. Booking Flow
async function confirmBooking() {
    try {
        const data = {
            salonId: appState.currentSalonId,
            service: appState.selectedService,
            staffId: 'staff_1', // mocked selection for demo
            time: '10:40 AM'
        };
        
        await api.createBooking(data);
        navigateTo('screen-booking-confirmed');
        // Refresh owner view silently
        loadOwnerDashboard(appState.currentSalonId);
    } catch (e) {
        console.error("Failed to book", e);
    }
}

async function markBookingDone(bookingId) {
    try {
        await api.updateBookingStatus(bookingId, 'done');
        loadOwnerDashboard(appState.currentSalonId);
    } catch(e) {
        console.error(e);
    }
}

// ==========================
// MODAL & UI LOGIC
// ==========================

let currentStaffElement = null;
let currentStaffId = null;

function openStaffModal(staffName, staffId, element) {
    const modal = document.getElementById('modal-staff-status');
    const title = document.getElementById('modal-staff-name');
    
    title.textContent = `Update ${staffName}`;
    currentStaffElement = element;
    currentStaffId = staffId;
    
    modal.showModal();
}

function closeStaffModal() {
    const modal = document.getElementById('modal-staff-status');
    modal.close();
    currentStaffElement = null;
    currentStaffId = null;
}

async function updateStaffStatus(newStatusText, statusClass) {
    if (currentStaffId) {
        try {
            await api.updateStaffStatus(currentStaffId, newStatusText);
            // Refresh dashboard to reflect new API state accurately
            loadOwnerDashboard(appState.currentSalonId);
        } catch(e) {
            console.error("Failed to update status", e);
        }
    }
    closeStaffModal();
}

function addInteractionEffects(elements) {
    elements.forEach(el => {
        el.addEventListener('mousedown', function() { this.style.transform = 'scale(0.96)'; });
        el.addEventListener('mouseup', function() { this.style.transform = ''; });
        el.addEventListener('mouseleave', function() { this.style.transform = ''; });
    });
}

// ==========================
// INITIALIZATION
// ==========================
document.addEventListener('DOMContentLoaded', () => {
    
    addInteractionEffects(document.querySelectorAll('.btn, .pill, .slot, .date-item'));

    // Hook up Continue button in slot selection
    const btnContinue = document.querySelector('#screen-select-slot .btn-primary');
    if(btnContinue) {
        btnContinue.onclick = confirmBooking;
    }

    // Toggle service pills in registration form
    const selectablePills = document.querySelectorAll('.selectable-pill');
    selectablePills.forEach(pill => {
        pill.addEventListener('click', () => {
            pill.classList.toggle('active');
        });
    });

    // Initial Data Loads
    loadSalons();
    loadOwnerDashboard(appState.currentSalonId);
});

// Demo Nav links
document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => {
    if(btn.textContent.includes('Live Floor')) btn.onclick = () => { navigateTo('screen-owner-dashboard'); loadOwnerDashboard(appState.currentSalonId); };
    if(btn.textContent.includes('Bookings')) btn.onclick = () => { navigateTo('screen-owner-bookings'); loadOwnerDashboard(appState.currentSalonId); };
});
