export interface User {
  _id: string;
  name: {
    first: string;
    last: string;
  };
  email: string;
  role: 'USER' | 'DOCTOR' | 'ADMIN';
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
}

export interface Request {
  _id: string;
  userId: string | User;
  petId?: string;
  description: string;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  acceptedBy?: string;
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
  rating?: {
    score: number;
    review?: string;
  };
  createdAt: string;
}

export interface DoctorProfile {
  userId: string;
  qualifications: string;
  ratingAvg: number;
  ratingCount: number;
  available: boolean;
}
