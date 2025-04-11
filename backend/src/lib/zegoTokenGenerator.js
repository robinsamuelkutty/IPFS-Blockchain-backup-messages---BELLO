import crypto from "crypto";

// Error codes enum
const ErrorCode = {
  success: 0,
  appIDInvalid: 1,
  userIDInvalid: 3,
  secretInvalid: 5,
  effectiveTimeInSecondsInvalid: 6
};

// Function to return random number within given range
function RndNum(a, b) {
  return Math.ceil((a + (b - a)) * Math.random());
}

// Function to generate random 16 character string for IV
function makeRandomIv() {
  const str = '0123456789abcdefghijklmnopqrstuvwxyz';
  const result = [];
  for (let i = 0; i < 16; i++) {
    const r = Math.floor(Math.random() * str.length);
    result.push(str.charAt(r));
  }
  return result.join('');
}

// Function to determine algorithm based on length of secret key
function getAlgorithm(keyBase64) {
  const key = Buffer.from(keyBase64);
  switch (key.length) {
    case 16:
      return 'aes-128-cbc';
    case 24:
      return 'aes-192-cbc';
    case 32:
      return 'aes-256-cbc';
  }
  throw new Error('Invalid key length: ' + key.length);
}

// AES encryption function using CBC/PKCS5Padding mode
function aesEncrypt(plainText, key, iv) {
  const cipher = crypto.createCipheriv(getAlgorithm(key), key, iv);
  cipher.setAutoPadding(true);
  const encrypted = cipher.update(plainText);
  const final = cipher.final();
  const out = Buffer.concat([encrypted, final]);
  return Uint8Array.from(out).buffer;
}

/**
 * Generate a ZegoCloud token for authentication
 * @param {number} appId - ZegoCloud App ID
 * @param {string} userId - User ID
 * @param {string} secret - ZegoCloud App Sign/Secret
 * @param {number} effectiveTimeInSeconds - Token validity in seconds
 * @param {string} payload - Optional additional data
 * @returns {string} The generated token
 */
export function generateToken04(appId, userId, secret, effectiveTimeInSeconds, payload) {
  if (!appId || typeof appId !== 'number') {
    throw {
      errorCode: ErrorCode.appIDInvalid,
      errorMessage: 'appID invalid'
    };
  }
  
  if (!userId || typeof userId !== 'string') {
    throw {
      errorCode: ErrorCode.userIDInvalid,
      errorMessage: 'userId invalid'
    };
  }
  
  if (!secret || typeof secret !== 'string' || secret.length !== 32) {
    throw {
      errorCode: ErrorCode.secretInvalid,
      errorMessage: 'secret must be a 32 byte string'
    };
  }
  
  if (!effectiveTimeInSeconds || typeof effectiveTimeInSeconds !== 'number') {
    throw {
      errorCode: ErrorCode.effectiveTimeInSecondsInvalid,
      errorMessage: 'effectiveTimeInSeconds invalid'
    };
  }
  
  const createTime = Math.floor(new Date().getTime() / 1000);
  
  const tokenInfo = {
    app_id: appId,
    user_id: userId,
    nonce: RndNum(-2147483648, 2147483647),
    ctime: createTime,
    expire: createTime + effectiveTimeInSeconds,
    payload: payload || ''
  };
  
  const plaintText = JSON.stringify(tokenInfo);
  const iv = makeRandomIv();
  const encryptBuf = aesEncrypt(plaintText, secret, iv);
  
  const [b1, b2, b3] = [new Uint8Array(8), new Uint8Array(2), new Uint8Array(2)];
  new DataView(b1.buffer).setBigInt64(0, BigInt(tokenInfo.expire), false);
  new DataView(b2.buffer).setUint16(0, iv.length, false);
  new DataView(b3.buffer).setUint16(0, encryptBuf.byteLength, false);
  
  const buf = Buffer.concat([
    Buffer.from(b1),
    Buffer.from(b2),
    Buffer.from(iv),
    Buffer.from(b3),
    Buffer.from(encryptBuf),
  ]);
  
  const dv = new DataView(Uint8Array.from(buf).buffer);
  
  return '04' + Buffer.from(dv.buffer).toString('base64');
}