// middleware/ipWhitelist.js
const logger = require('../utils/logger'); // make sure logger is available

// const RAZORPAY_IPS = new Set([
//   '52.66.56.50',
//   '52.66.148.214',
//   // add others
// ]);

// function normalizeIp(ip) {
//   if (!ip) return '';
//   // if IPv6-mapped IPv4 like ::ffff:52.66.56.50, return the IPv4 part
//   if (ip.startsWith('::ffff:')) return ip.split(':').pop();
//   // If it contains port (rare), strip it: '127.0.0.1:1234'
//   return ip.split(':')[0];
// }

// const webhookIpWhitelist = (req, res, next) => {
//   // Consider X-Forwarded-For if you're behind a trusted proxy:
//   // const xff = req.headers['x-forwarded-for'];
//   // const remote = xff ? xff.split(',')[0].trim() : (req.ip || req.connection.remoteAddress);
//   const remote = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim()
//                  : (req.ip || req.connection?.remoteAddress);
//   const clientIp = normalizeIp(remote);

//   if (!RAZORPAY_IPS.has(clientIp)) {
//     logger.warn('Unauthorized webhook attempt', { ip: clientIp, path: req.path });
//     return res.status(403).json({ error: 'Forbidden' });
//   }

//   next();
// };

// TEMPORARY: Disable whitelist for development & ngrok testing
 const webhookIpWhitelist = (req, res, next) => {
  return next();
};


module.exports = webhookIpWhitelist;




// // middleware/ipWhitelist.js
// const RAZORPAY_IPS = [
//   '52.66.56.50',
//   '52.66.148.214',
//   // Add all Razorpay webhook IPs
// ];

// const webhookIpWhitelist = (req, res, next) => {
//   const clientIp = req.ip || req.connection.remoteAddress;
  
//   if (!RAZORPAY_IPS.includes(clientIp)) {
//     logger.warn('Unauthorized webhook attempt', { ip: clientIp });
//     return res.status(403).json({ error: 'Forbidden' });
//   }
  
//   next();
// };

// module.exports = webhookIpWhitelist;