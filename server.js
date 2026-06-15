const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- IN-MEMORY DATABASE ---
let db = {
    salons: [
        {
            id: 'salon_1',
            name: 'Urban Trim Studio',
            license: 'LIC-12345',
            services: ['Haircut', 'Beard Trim'],
            products: 'L\'Oreal, Moroccanoil',
            rating: 4.8,
            status: 'Available Now',
            lat: 19.0600, // Bandra West approximate
            lng: 72.8360
        },
        {
            id: 'salon_2',
            name: 'Glow & Groom',
            license: 'LIC-98765',
            services: ['Spa', 'Facial'],
            products: 'Olaplex',
            rating: 4.6,
            status: 'Filling Up',
            lat: 19.0800, // Santacruz approximate
            lng: 72.8400
        }
    ],
    staff: [
        { id: 'staff_1', salonId: 'salon_1', name: 'Arjun Rao', initials: 'AR', status: 'In Service', details: 'Classic haircut \u00b7 00:21 elapsed' },
        { id: 'staff_2', salonId: 'salon_1', name: 'Maya Sen', initials: 'MS', status: 'Available', details: 'Open until 1:00 PM' },
        { id: 'staff_3', salonId: 'salon_1', name: 'Vikram K.', initials: 'VK', status: 'On Break', details: 'Returns 10:50 AM' }
    ],
    bookings: [
        { id: 'book_1', salonId: 'salon_1', customerName: 'Rahul M.', service: 'Classic Haircut', staffId: 'staff_1', time: '10:40 AM', status: 'pending' },
        { id: 'book_2', salonId: 'salon_1', customerName: 'Sneha K.', service: 'Hair Spa', staffId: 'staff_2', time: '11:20 AM', status: 'pending' },
        { id: 'book_3', salonId: 'salon_1', customerName: 'Amit V.', service: 'Beard Trim', staffId: 'staff_3', time: '09:00 AM', status: 'done' }
    ]
};

// --- ROUTES ---

// Get all salons (Discovery View)
app.get('/api/salons', (req, res) => {
    let result = [...db.salons];
    const userLat = parseFloat(req.query.lat);
    const userLng = parseFloat(req.query.lng);

    if (!isNaN(userLat) && !isNaN(userLng)) {
        // Calculate distance for each salon using Haversine formula
        result = result.map(salon => {
            const R = 6371; // Earth's radius in km
            const dLat = (salon.lat - userLat) * Math.PI / 180;
            const dLng = (salon.lng - userLng) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(userLat * Math.PI / 180) * Math.cos(salon.lat * Math.PI / 180) *
                      Math.sin(dLng/2) * Math.sin(dLng/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const distanceKm = R * c;
            
            return {
                ...salon,
                distanceVal: distanceKm,
                distance: distanceKm.toFixed(1) + ' km'
            };
        });

        // Sort by closest distance
        result.sort((a, b) => a.distanceVal - b.distanceVal);
    } else {
        // Fallback distance string if no location provided
        result = result.map(salon => ({ ...salon, distance: 'Distance unknown' }));
    }

    res.json(result);
});

// Register a new salon
app.post('/api/salons', (req, res) => {
    const newSalon = {
        id: 'salon_' + Date.now(),
        name: req.body.name,
        license: req.body.license,
        services: req.body.services || [],
        products: req.body.products || '',
        rating: 5.0,
        status: 'Available Now',
        lat: req.body.lat || 19.0760, // Default to Mumbai center if not provided
        lng: req.body.lng || 72.8777
    };
    db.salons.push(newSalon);
    
    // Auto-generate some staff for the new salon
    db.staff.push({ id: 'staff_' + Date.now() + '1', salonId: newSalon.id, name: 'Lead Stylist', initials: 'LS', status: 'Available', details: 'Open until 5:00 PM' });
    
    res.status(201).json(newSalon);
});

// Get staff for a specific salon (Slot Selection & Owner Dashboard)
app.get('/api/salons/:salonId/staff', (req, res) => {
    const staff = db.staff.filter(s => s.salonId === req.params.salonId);
    res.json(staff);
});

// Update a staff member's status (Owner Live Floor Modal)
app.put('/api/staff/:id/status', (req, res) => {
    const staffMember = db.staff.find(s => s.id === req.params.id);
    if (staffMember) {
        staffMember.status = req.body.status;
        res.json(staffMember);
    } else {
        res.status(404).json({ error: 'Staff not found' });
    }
});

// Get bookings for a salon (Owner Bookings View)
app.get('/api/salons/:salonId/bookings', (req, res) => {
    const bookings = db.bookings.filter(b => b.salonId === req.params.salonId);
    res.json(bookings);
});

// Create a new booking (User Slot Selection)
app.post('/api/bookings', (req, res) => {
    const newBooking = {
        id: 'SS-' + Math.floor(1000 + Math.random() * 9000),
        salonId: req.body.salonId,
        customerName: 'Guest User',
        service: req.body.service,
        staffId: req.body.staffId,
        time: req.body.time,
        status: 'pending'
    };
    db.bookings.push(newBooking);
    res.status(201).json(newBooking);
});

// Complete a booking (Owner Bookings View)
app.put('/api/bookings/:id/status', (req, res) => {
    const booking = db.bookings.find(b => b.id === req.params.id);
    if (booking) {
        booking.status = req.body.status;
        res.json(booking);
    } else {
        res.status(404).json({ error: 'Booking not found' });
    }
});

// Export the Express API for Vercel Serverless Functions
module.exports = app;

// Only start the local server if we aren't in a serverless environment
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`BookMySalon Backend running on http://localhost:${PORT}`);
    });
}
