# Supabase Database Schema

This document outlines the required database schema for the LeadScout Pro AI SaaS application.

## Tables

### user_profiles
```sql
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  credits INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE
    ON user_profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
```

### query_history
```sql
CREATE TABLE query_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) NOT NULL,
  query TEXT NOT NULL,
  location TEXT NOT NULL,
  focus TEXT NOT NULL,
  intensity TEXT NOT NULL DEFAULT 'standard',
  results JSONB NOT NULL DEFAULT '[]',
  cost DECIMAL(10,2) NOT NULL DEFAULT 5.00,
  downloaded BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE query_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own queries" ON query_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own queries" ON query_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own queries" ON query_history
  FOR UPDATE USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_query_history_user_id ON query_history(user_id);
CREATE INDEX idx_query_history_created_at ON query_history(created_at DESC);
```

### payments
```sql
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  stripe_payment_id TEXT NOT NULL UNIQUE,
  credits_added INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_stripe_id ON payments(stripe_payment_id);
```

## Functions

### Create user profile on signup
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

## Environment Variables Required

Add these to your Supabase project settings:

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `VITE_STRIPE_PUBLIC_KEY`: Your Stripe publishable key
- `VITE_GEMINI_API_KEY`: Your Google Gemini API key

## Setup Instructions

1. Create a new Supabase project
2. Run the SQL commands above in the Supabase SQL editor
3. Configure authentication (enable email/password auth)
4. Set up the environment variables in your `.env.local` file
5. Configure Stripe webhooks (for production)

## Notes

- All tables use UUID for primary keys
- Row Level Security is enabled for data protection
- User profiles are automatically created when users sign up
- Query results are stored as JSONB for flexibility
- Stripe integration is prepared but requires backend webhook handling for production