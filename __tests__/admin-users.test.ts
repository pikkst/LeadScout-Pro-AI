import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  name: z.string().min(2, "Name is required").max(120),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const updateUserSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  email: z.string().email().transform((v) => v.toLowerCase().trim()).optional(),
  role: z.enum(["ADMIN", "MANAGER", "AGENT"]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
});

describe('Admin User Management', () => {
  describe('Create user schema', () => {
    it('accepts valid input', () => {
      const result = createUserSchema.parse({
        email: 'Agent@UnitelGlobal.com',
        name: 'Jane Doe',
        password: 'securePassword123',
      });
      expect(result.email).toBe('agent@unitelglobal.com');
      expect(result.name).toBe('Jane Doe');
      expect(result.password).toBe('securePassword123');
    });

    it('rejects short password', () => {
      expect(() =>
        createUserSchema.parse({ email: 'a@b.com', name: 'Jane', password: 'short' }),
      ).toThrow();
    });

    it('rejects short name', () => {
      expect(() =>
        createUserSchema.parse({ email: 'a@b.com', name: 'J', password: 'securePassword123' }),
      ).toThrow();
    });

    it('rejects invalid email', () => {
      expect(() =>
        createUserSchema.parse({ email: 'notanemail', name: 'Jane', password: 'securePassword123' }),
      ).toThrow();
    });
  });

  describe('Update user schema', () => {
    it('accepts partial updates', () => {
      const result = updateUserSchema.parse({ role: 'MANAGER' });
      expect(result.role).toBe('MANAGER');
    });

    it('accepts multiple fields', () => {
      const result = updateUserSchema.parse({ name: 'New Name', isActive: false });
      expect(result.name).toBe('New Name');
      expect(result.isActive).toBe(false);
    });

    it('rejects invalid role', () => {
      expect(() => updateUserSchema.parse({ role: 'SUPERADMIN' })).toThrow();
    });

    it('rejects short password on update', () => {
      expect(() => updateUserSchema.parse({ password: 'short' })).toThrow();
    });
  });

  describe('Password hashing', () => {
    it('hashes passwords securely', async () => {
      const hash = await bcrypt.hash('securePassword123', 12);
      const match = await bcrypt.compare('securePassword123', hash);
      expect(match).toBe(true);
      const badMatch = await bcrypt.compare('wrongPassword', hash);
      expect(badMatch).toBe(false);
    });
  });
});
