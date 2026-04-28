const cities = [
  "surat",
  "ahmedabad",
  "mumbai",
  "delhi",
  "bangalore",
  "pune",
  "jaipur"
];

function extractCity(message) {
  const text = message.toLowerCase();
  return cities.find(city => text.includes(city)) || null;
}

module.exports = extractCity;
