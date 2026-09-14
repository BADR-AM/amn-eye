import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const DEFAULT_JWT_SECRET = '7e131eddafb06b08511e744666e8d2d34137b093a9e8e66ba0f1d194b4eda80ae326ed4d84ed35b6d54792892f4e7b4d';
const DEFAULT_ADMIN_HASH = '$2b$10$evVJHyRwRgL9HSRo7suUJuIMws6KgtbPYj7J29ibe9XCy4jrUulLa';

const getSecret = () => process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
const getHash = () => process.env.ADMIN_PASSWORD_HASH || DEFAULT_ADMIN_HASH;
const TOKEN_EXPIRY = '24h';

export const generateToken = (payload) => {
  return jwt.sign(payload, getSecret(), { expiresIn: TOKEN_EXPIRY });
};

export const verifyToken = (token) => {
  return jwt.verify(token, getSecret());
};

export const comparePassword = async (plain, hash) => {
  return bcrypt.compare(plain, hash);
};

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'غير مصرح - يرجى تسجيل الدخول' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'الجلسة منتهية الصلاحية - يرجى إعادة تسجيل الدخول' });
  }
};

export const handleLogin = async (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'كلمة المرور مطلوبة' });
  }

  try {
    const match = await comparePassword(password, getHash());
    if (!match) {
      return res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
    }

    const token = generateToken({ role: 'admin' });
    res.json({ token, role: 'admin' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'خطأ في تسجيل الدخول' });
  }
};
