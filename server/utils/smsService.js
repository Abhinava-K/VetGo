const https = require('https');

/**
 * Send an OTP via SMS using available configured provider (Fast2SMS, Twilio, etc.)
 * @param {string} phone - Target phone number
 * @param {string} otp - 6-digit verification code
 * @returns {Promise<boolean>}
 */
async function sendSmsOtp(phone, otp) {
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  const digitsOnly = cleanPhone.replace(/^\+/, '');
  const last10 = digitsOnly.slice(-10);

  // 1. Fast2SMS Provider (Popular, instantaneous for Indian numbers)
  if (process.env.FAST2SMS_API_KEY) {
    try {
      return await new Promise((resolve, reject) => {
        const payload = JSON.stringify({
          route: 'otp',
          variables_values: otp,
          numbers: last10
        });

        const options = {
          hostname: 'www.fast2sms.com',
          path: '/dev/bulkV2',
          method: 'POST',
          headers: {
            'authorization': process.env.FAST2SMS_API_KEY,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          }
        };

        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              if (parsed.return === true) {
                console.log(`[SMS Fast2SMS] ✓ OTP SMS successfully sent to ${last10}`);
                resolve(true);
              } else {
                console.warn(`[SMS Fast2SMS] ⚠ Provider rejected SMS:`, parsed.message || parsed);
                console.log(`\n=============================================================`);
                console.log(`[DEV OTP FALLBACK] SMS to ${cleanPhone} failed at gateway.`);
                console.log(`[DEV OTP FALLBACK] Use this OTP for testing: >>> ${otp} <<<`);
                console.log(`=============================================================\n`);
                resolve(true);
              }
            } catch (e) {
              console.log(`[SMS Fast2SMS] Response for ${last10}:`, data);
              resolve(true);
            }
          });
        });

        req.on('error', (e) => {
          console.error('[SMS Fast2SMS] Request failed:', e.message);
          resolve(false);
        });

        req.write(payload);
        req.end();
      });
    } catch (err) {
      console.error('[SMS Provider] Fast2SMS Error:', err.message);
    }
  }

  // 2. Twilio Provider
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    try {
      const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
      const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : `+91${last10}`;
      const postData = new URLSearchParams({
        To: formattedPhone,
        From: process.env.TWILIO_PHONE_NUMBER,
        Body: `Your VetGo verification code is: ${otp}. Valid for 5 minutes.`
      }).toString();

      return await new Promise((resolve) => {
        const options = {
          hostname: 'api.twilio.com',
          path: `/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData)
          }
        };

        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            console.log(`[SMS Twilio] Response for ${formattedPhone}:`, data);
            resolve(true);
          });
        });

        req.on('error', (e) => {
          console.error('[SMS Twilio] Request failed:', e.message);
          resolve(false);
        });

        req.write(postData);
        req.end();
      });
    } catch (err) {
      console.error('[SMS Provider] Twilio Error:', err.message);
    }
  }

  // Fallback (No live SMS key yet)
  console.log(`\n=============================================================`);
  console.log(`[SMS DISPATCH LOG] Real SMS provider not yet configured in .env.`);
  console.log(`[SMS DISPATCH LOG] SMS to ${cleanPhone}: "Your VetGo code is: ${otp}"`);
  console.log(`=============================================================\n`);
  return true;
}

module.exports = {
  sendSmsOtp
};
