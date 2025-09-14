-- Add truck information fields to carters table
ALTER TABLE carters ADD COLUMN truck_make TEXT;
ALTER TABLE carters ADD COLUMN truck_model TEXT;
ALTER TABLE carters ADD COLUMN truck_capacity TEXT;