# VetGo - Emergency Veterinary Assistance

VetGo is a mobile platform (Rapido/Uber for Vets) that connects pet owners with nearby veterinary doctors for urgent on-site care. It is built using the MERN stack (MongoDB, Express, React Native/Expo, Node.js) with a focus on real-time tracking and security.

## 🚀 Key Features
- **Real-time Matching**: Users broadcast emergency requests to doctors within a 5km radius.
- **Live GPS Tracking**: Users can track the assigned doctor's progress on a map.
- **Secure Data**: AES-256-GCM encryption for phone numbers and sensitive fields.
- **Doctor Vetting**: Admin approval workflow for veterinary certifications.
- **Pet Profiles**: Manage medical history and animal details.
- **Dark/Light Mode**: Full theme support for professional mobile experience.

---

## 🛠️ Tech Stack
- **Frontend**: React Native (Expo), TypeScript (TSX), React Navigation.
- **Backend**: Node.js, Express, Socket.io.
- **Database**: MongoDB (with GeoJSON for spatial queries).
- **Security**: JWT (Access/Refresh), bcrypt, AES-256-GCM.

---

## 📦 Getting Started

### 1. Prerequisites
- Node.js (v16+)
- Expo CLI (`npm install -g expo-cli`)
- MongoDB (Local or Atlas)

### 2. Backend Setup
```bash
cd server
npm install
cp .env.example .env
# Update .env with your MONGO_URI and generate encryption keys
npm run dev
```
**Generating Encryption Key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Frontend Setup
```bash
cd client
npm install
npx expo start
```

---

## 👨‍💼 Admin Setup (Doctor Vetting)
For testing, you need an ADMIN user to approve doctor applications:
1. Run the seed script: `cd server && npm run seed:admin`
2. Login with the generated admin credentials.
3. Use the admin endpoints (or Postman) to approve PENDING doctors.

---

## 📡 API Documentation
Full API documentation is provided in the `server/vetgo_api.postman_collection.json` file. 

### Core Endpoints:
- `POST /api/auth/signup/user` - Register as pet owner.
- `POST /api/auth/signup/doctor` - Apply as vet (PENDING status).
- `POST /api/requests` - Create emergency broadcast.
- `GET /api/doctors/nearby` - Fetch nearby available vets.
- `POST /api/admin/doctor-applications/:userId/approve` - Admin approval.

---

## 🗺️ Real-time GPS & Routing
- **Location Tracking**: Uses `expo-location` with 10m precision.
- **Navigation**: Deep-links to native Google/Apple Maps for turn-by-turn directions.
- **Algorithm**: Includes a documented A* skeleton in `server/utils/fallbackAstar.js` for future road-graph integration.

---

## 🔐 Security Configuration
- **Encryption**: Phone numbers are encrypted before being stored in MongoDB.
- **Authentication**: Access tokens expire in 15m; refresh tokens in 7d (stored in httpOnly cookies).
- **Validation**: Strict Joi schema validation on all inputs.

---