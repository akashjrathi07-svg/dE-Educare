import { describe, expect, it } from 'vitest';
import { poolerUrl } from './db-url';

describe('poolerUrl', () => {
  it('moves the Supabase session pooler to the transaction pooler', () => {
    expect(poolerUrl('postgresql://postgres.abc:pw@aws-1-ap-south-1.pooler.supabase.com:5432/postgres')).toBe('postgresql://postgres.abc:pw@aws-1-ap-south-1.pooler.supabase.com:6543/postgres');
  });
  it('leaves other URLs alone', () => {
    expect(poolerUrl('postgresql://postgres.abc:pw@aws-1-ap-south-1.pooler.supabase.com:6543/postgres')).toContain(':6543/');
    expect(poolerUrl('postgresql://postgres:pw@db.abc.supabase.co:5432/postgres')).toContain('db.abc.supabase.co:5432');
    expect(poolerUrl('postgres://postgres@localhost:5432/de')).toBe('postgres://postgres@localhost:5432/de');
  });
});
