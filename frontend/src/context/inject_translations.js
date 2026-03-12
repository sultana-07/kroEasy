const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'LanguageContext.jsx');
let c = fs.readFileSync(file, 'utf8');

// The last few lines of the Hindi section end with bookingFailed, then closes.
// We need to inject 3 new Hindi keys before the closing  },  };
const searchStr = `    bookingFailed: '\\u092c\\u0941\\u0915\\u093f\\u0902\\u0917 \\u0935\\u093f\\u092b\\u0932',\r\n  },\r\n};`;

// Try alternative — look for last occurrence of bookingFailed in the file
const insertAfter = `    bookingFailed: '`;
const lastIdx = c.lastIndexOf(insertAfter);
const lineEnd = c.indexOf('\n', lastIdx);

const newKeys = `\r\n    loginToViewProfile: 'लॉगिन / रजिस्टर',\r\n    loginToViewProfileSub: 'प्रोफ़ाइल और बुकिंग देखने के लिए लॉगिन करें।',\r\n    noServiceProvidersYet: 'अभी कोई सेवा प्रदाता रजिस्टर्ड नहीं',`;

c = c.slice(0, lineEnd + 1) + newKeys + c.slice(lineEnd + 1);

fs.writeFileSync(file, c, 'utf8');
console.log('Done! Check lines around end of Hindi section.');
