import bcrypt from 'bcryptjs';

export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(12);

  return await bcrypt.hash(password, salt);
};

export async function comparePassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}