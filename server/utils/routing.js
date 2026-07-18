/**
 * Haversine formula to calculate the great-circle distance between two points
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Basic ETA calculation based on distance and average speed
 * @param {number} distanceKm 
 * @param {number} avgSpeedKph default 30km/h (city traffic)
 * @returns {number} ETA in minutes
 */
const calculateETA = (distanceKm, avgSpeedKph = 30) => {
  return Math.round((distanceKm / avgSpeedKph) * 60);
};

module.exports = {
  calculateDistance,
  calculateETA
};
