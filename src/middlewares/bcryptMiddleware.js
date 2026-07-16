import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/** Hashes a plaintext password for storage. Never store or return plaintext passwords. */
export const hashPassword = async (password) => {
	return await bcrypt.hash(password, SALT_ROUNDS);
};

/** Compares a plaintext password against a stored hash. Returns true/false. */
export const comparePassword = async (password, hash) => {
return await bcrypt.compare(password, hash)
};
