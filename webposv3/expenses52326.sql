-- 1. Create Expense Category Enum (Optional, but ensures clean data)
CREATE TYPE expense_category AS ENUM (
    'Utilities',       -- Electricity, Water, Internet
    'Supplier',        -- Raw materials, inventory restocking
    'Rent',            -- Shop / Space rental
    'Salaries',        -- Staff payroll or advances
    'Marketing',       -- Ads, flyers, promos
    'Maintenance',     -- Repairs, cleaning supplies, IT equipment
    'Spoilage/Loss',   -- Damaged or expired inventory
    'Miscellaneous'    -- Anything else
);

-- 2. Create the Expenses Table
CREATE TABLE public.expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    category expense_category NOT NULL DEFAULT 'Miscellaneous',
    description TEXT NOT NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash', -- e.g., Cash, GCash, Bank Transfer
    reference_no VARCHAR(100), -- Invoice/Receipt/Transaction ID
    
    -- Audit Trail & Tracking
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Performance Indexes (Crucial for dashboard charts and date filtering)
CREATE INDEX idx_expenses_date ON public.expenses (expense_date DESC);
CREATE INDEX idx_expenses_category ON public.expenses (category);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- 5. Basic RLS Policies (Adjust roles based on your app's setup)
-- Policy: Allow authenticated users to view expenses
CREATE POLICY "Allow authenticated users to read expenses" 
ON public.expenses FOR SELECT 
TO authenticated 
USING (true);

-- Policy: Allow authenticated users to log new expenses
CREATE POLICY "Allow authenticated users to insert expenses" 
ON public.expenses FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = created_by);

-- Policy: Only allow full updates/deletions if necessary (typically restricted to Admin)
CREATE POLICY "Allow individual management of expenses" 
ON public.expenses FOR ALL 
TO authenticated 
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- 6. Automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_expenses_modtime
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();