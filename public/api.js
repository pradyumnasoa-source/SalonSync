// Frontend API Service
const API_URL = 'http://localhost:3000/api';

const api = {
    // Salons
    getSalons: async (lat, lng) => {
        let url = `${API_URL}/salons`;
        if (lat && lng) url += `?lat=${lat}&lng=${lng}`;
        const res = await fetch(url);
        return await res.json();
    },
    registerSalon: async (data) => {
        const res = await fetch(`${API_URL}/salons`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    },
    
    // Staff
    getStaff: async (salonId) => {
        const res = await fetch(`${API_URL}/salons/${salonId}/staff`);
        return await res.json();
    },
    updateStaffStatus: async (staffId, status) => {
        const res = await fetch(`${API_URL}/staff/${staffId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        return await res.json();
    },

    // Bookings
    getBookings: async (salonId) => {
        const res = await fetch(`${API_URL}/salons/${salonId}/bookings`);
        return await res.json();
    },
    createBooking: async (data) => {
        const res = await fetch(`${API_URL}/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    },
    updateBookingStatus: async (bookingId, status) => {
        const res = await fetch(`${API_URL}/bookings/${bookingId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        return await res.json();
    }
};
