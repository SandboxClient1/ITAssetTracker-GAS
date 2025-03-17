-- Create assets table
CREATE TABLE assets (
    id SERIAL PRIMARY KEY,
    registration_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	asset_id VARCHAR(50) UNIQUE NOT NULL,
    asset_type VARCHAR(50) NOT NULL,
    make VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100) UNIQUE,
    operating_system VARCHAR(50),
    processor VARCHAR(100),
    ram VARCHAR(50),
    storage VARCHAR(100),
    location VARCHAR(100),
    status VARCHAR(50),
    assignee VARCHAR(100),
    condition VARCHAR(50),
    notes TEXT
);

-- Create indexes for better performance
CREATE INDEX idx_asset_id ON assets(asset_id);
CREATE INDEX idx_serial_number ON assets(serial_number);
CREATE INDEX idx_status ON assets(status);