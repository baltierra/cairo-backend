-- =============================================
-- Historical Database Schema for PostgreSQL
-- Version: 1.0
-- =============================================

-- Clean up existing objects (for development - remove in production)
DROP TABLE IF EXISTS place_photo CASCADE;
DROP TABLE IF EXISTS event_place CASCADE;
DROP TABLE IF EXISTS event_person CASCADE;
DROP TABLE IF EXISTS person_place CASCADE;
DROP TABLE IF EXISTS historic_person CASCADE;
DROP TABLE IF EXISTS historic_place CASCADE;
DROP TABLE IF EXISTS historic_event CASCADE;
DROP TABLE IF EXISTS photo CASCADE;

-- Create custom types for better data integrity
DROP TYPE IF EXISTS significance_level CASCADE;
CREATE TYPE significance_level AS ENUM ('LOCAL', 'REGIONAL', 'NATIONAL', 'GLOBAL');

DROP TYPE IF EXISTS file_type CASCADE;
CREATE TYPE file_type AS ENUM ('png', 'jpg', 'jpeg');

-- =============================================
-- PHOTO table (created first as it's referenced by others)
-- =============================================
CREATE TABLE photo (
    photo_id SERIAL PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL UNIQUE,
    file_type file_type NOT NULL,
    caption VARCHAR(250),
    upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    file_size INTEGER CHECK (file_size > 0),
    -- Additional metadata fields for PostgreSQL
    mime_type VARCHAR(50) GENERATED ALWAYS AS (
        CASE file_type::text
            WHEN 'png' THEN 'image/png'
            WHEN 'jpg' THEN 'image/jpeg'
            WHEN 'jpeg' THEN 'image/jpeg'
        END
    ) STORED,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX idx_photo_upload_date ON photo(upload_date DESC);
CREATE INDEX idx_photo_file_type ON photo(file_type);

-- =============================================
-- HISTORIC_PERSON table
-- =============================================
CREATE TABLE historic_person (
    person_id SERIAL PRIMARY KEY,
    first_name VARCHAR(25) NOT NULL CHECK (first_name ~ '^[A-Za-z\s\-'']+$'),
    last_name VARCHAR(25) NOT NULL CHECK (last_name ~ '^[A-Za-z\s\-'']+$'),
    dob DATE,
    brief VARCHAR(250),
    biography TEXT CHECK (LENGTH(biography) <= 10000),
    date_added DATE NOT NULL DEFAULT CURRENT_DATE,
    date_modified DATE NOT NULL DEFAULT CURRENT_DATE,
    profile_photo_id INTEGER UNIQUE REFERENCES photo(photo_id) ON DELETE SET NULL,
    -- Additional fields for better data management
    full_name VARCHAR(51) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    -- Audit fields
    created_by VARCHAR(100),
    modified_by VARCHAR(100),
    CONSTRAINT valid_dob CHECK (dob <= CURRENT_DATE)
);

-- Indexes for common queries
CREATE INDEX idx_person_full_name ON historic_person(full_name);
CREATE INDEX idx_person_last_name ON historic_person(last_name);
CREATE INDEX idx_person_dob ON historic_person(dob);
CREATE INDEX idx_person_date_added ON historic_person(date_added DESC);

-- Full text search index for biography
CREATE INDEX idx_person_biography_fts ON historic_person USING gin(to_tsvector('english', biography));

-- =============================================
-- HISTORIC_PLACE table
-- =============================================
CREATE TABLE historic_place (
    place_id SERIAL PRIMARY KEY,
    place_name VARCHAR(50) NOT NULL CHECK (LENGTH(TRIM(place_name)) > 0),
    -- PostgreSQL specific: using NUMERIC for precise coordinate storage
    latitude NUMERIC(10,8) NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
    longitude NUMERIC(11,8) NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
    date_start DATE,
    date_end DATE,
    brief VARCHAR(250),
    history TEXT CHECK (LENGTH(history) <= 10000),
    date_added DATE NOT NULL DEFAULT CURRENT_DATE,
    date_modified DATE NOT NULL DEFAULT CURRENT_DATE,
    -- Additional fields
    is_active BOOLEAN GENERATED ALWAYS AS (
        CASE 
            WHEN date_end IS NULL OR date_end >= CURRENT_DATE THEN TRUE
            ELSE FALSE
        END
    ) STORED,
    -- PostGIS point for spatial queries (optional - requires PostGIS extension)
    -- Uncomment if PostGIS is installed:
    -- location GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (ST_MakePoint(longitude, latitude)::geography) STORED,
    -- Audit fields
    created_by VARCHAR(100),
    modified_by VARCHAR(100),
    CONSTRAINT valid_date_range CHECK (
        date_start IS NULL OR 
        date_end IS NULL OR 
        date_start <= date_end
    )
);

-- Indexes for common queries
CREATE INDEX idx_place_name ON historic_place(place_name);
CREATE INDEX idx_place_coordinates ON historic_place(latitude, longitude);
CREATE INDEX idx_place_date_range ON historic_place(date_start, date_end);
CREATE INDEX idx_place_is_active ON historic_place(is_active);

-- Full text search index for history
CREATE INDEX idx_place_history_fts ON historic_place USING gin(to_tsvector('english', history));

-- If using PostGIS (uncomment if extension is installed):
-- CREATE INDEX idx_place_location ON historic_place USING GIST(location);

-- =============================================
-- HISTORIC_EVENT table
-- =============================================
CREATE TABLE historic_event (
    event_id SERIAL PRIMARY KEY,
    event_name VARCHAR(100) NOT NULL CHECK (LENGTH(TRIM(event_name)) > 0),
    event_date DATE NOT NULL,
    event_description TEXT NOT NULL CHECK (LENGTH(event_description) <= 10000),
    significance significance_level DEFAULT 'LOCAL',
    date_added DATE NOT NULL DEFAULT CURRENT_DATE,
    date_modified DATE NOT NULL DEFAULT CURRENT_DATE,
    -- Additional fields for better event tracking
    event_end_date DATE,
    event_type VARCHAR(50),
    source_references TEXT,
    -- Audit fields
    created_by VARCHAR(100),
    modified_by VARCHAR(100),
    CONSTRAINT valid_event_dates CHECK (
        event_end_date IS NULL OR 
        event_date <= event_end_date
    ),
    CONSTRAINT valid_event_date CHECK (event_date <= CURRENT_DATE)
);

-- Indexes for common queries
CREATE INDEX idx_event_name ON historic_event(event_name);
CREATE INDEX idx_event_date ON historic_event(event_date DESC);
CREATE INDEX idx_event_date_range ON historic_event(event_date, event_end_date);
CREATE INDEX idx_event_significance ON historic_event(significance);
CREATE INDEX idx_event_type ON historic_event(event_type);

-- Full text search index for event description
CREATE INDEX idx_event_description_fts ON historic_event USING gin(to_tsvector('english', event_description));

-- =============================================
-- PERSON_PLACE junction table
-- =============================================
CREATE TABLE person_place (
    person_id INTEGER NOT NULL REFERENCES historic_person(person_id) ON DELETE CASCADE,
    place_id INTEGER NOT NULL REFERENCES historic_place(place_id) ON DELETE CASCADE,
    association_date DATE,
    association_type VARCHAR(50),
    association_notes TEXT,
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (person_id, place_id, COALESCE(association_date, '1900-01-01'::DATE))
);

-- Indexes for queries
CREATE INDEX idx_person_place_person ON person_place(person_id);
CREATE INDEX idx_person_place_place ON person_place(place_id);
CREATE INDEX idx_person_place_date ON person_place(association_date);
CREATE INDEX idx_person_place_type ON person_place(association_type);

-- =============================================
-- EVENT_PERSON junction table
-- =============================================
CREATE TABLE event_person (
    event_id INTEGER NOT NULL REFERENCES historic_event(event_id) ON DELETE CASCADE,
    person_id INTEGER NOT NULL REFERENCES historic_person(person_id) ON DELETE CASCADE,
    role VARCHAR(100),
    role_description TEXT,
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id, person_id)
);

-- Indexes for queries
CREATE INDEX idx_event_person_event ON event_person(event_id);
CREATE INDEX idx_event_person_person ON event_person(person_id);
CREATE INDEX idx_event_person_role ON event_person(role);

-- =============================================
-- EVENT_PLACE junction table
-- =============================================
CREATE TABLE event_place (
    event_id INTEGER NOT NULL REFERENCES historic_event(event_id) ON DELETE CASCADE,
    place_id INTEGER NOT NULL REFERENCES historic_place(place_id) ON DELETE CASCADE,
    location_role VARCHAR(100) DEFAULT 'primary_location',
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id, place_id)
);

-- Indexes for queries
CREATE INDEX idx_event_place_event ON event_place(event_id);
CREATE INDEX idx_event_place_place ON event_place(place_id);

-- =============================================
-- PLACE_PHOTO junction table
-- =============================================
CREATE TABLE place_photo (
    place_id INTEGER NOT NULL REFERENCES historic_place(place_id) ON DELETE CASCADE,
    photo_id INTEGER NOT NULL REFERENCES photo(photo_id) ON DELETE CASCADE,
    photo_order SMALLINT NOT NULL CHECK (photo_order BETWEEN 1 AND 10),
    is_primary BOOLEAN DEFAULT FALSE,
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (place_id, photo_id),
    -- Ensure unique photo order per place
    UNIQUE (place_id, photo_order)
);

-- Indexes for queries
CREATE INDEX idx_place_photo_place ON place_photo(place_id);
CREATE INDEX idx_place_photo_photo ON place_photo(photo_id);
CREATE INDEX idx_place_photo_order ON place_photo(place_id, photo_order);

-- =============================================
-- Trigger Functions for automatic date_modified updates
-- =============================================
CREATE OR REPLACE FUNCTION update_date_modified()
RETURNS TRIGGER AS $$
BEGIN
    NEW.date_modified = CURRENT_DATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for each main table
CREATE TRIGGER update_person_date_modified
    BEFORE UPDATE ON historic_person
    FOR EACH ROW
    EXECUTE FUNCTION update_date_modified();

CREATE TRIGGER update_place_date_modified
    BEFORE UPDATE ON historic_place
    FOR EACH ROW
    EXECUTE FUNCTION update_date_modified();

CREATE TRIGGER update_event_date_modified
    BEFORE UPDATE ON historic_event
    FOR EACH ROW
    EXECUTE FUNCTION update_date_modified();

-- =============================================
-- Trigger for updated_at timestamp on photo table
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_photo_updated_at
    BEFORE UPDATE ON photo
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- =============================================
-- Function to enforce maximum 10 photos per place
-- =============================================
CREATE OR REPLACE FUNCTION check_place_photo_limit()
RETURNS TRIGGER AS $$
DECLARE
    photo_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO photo_count
    FROM place_photo
    WHERE place_id = NEW.place_id;
    
    IF photo_count >= 10 THEN
        RAISE EXCEPTION 'A place cannot have more than 10 photos';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_place_photo_limit
    BEFORE INSERT ON place_photo
    FOR EACH ROW
    EXECUTE FUNCTION check_place_photo_limit();

-- =============================================
-- Views for common queries
-- =============================================

-- View: Person with their current place associations
CREATE OR REPLACE VIEW v_person_current_places AS
SELECT 
    hp.person_id,
    hp.full_name,
    hp.dob,
    hpl.place_id,
    hpl.place_name,
    hpl.latitude,
    hpl.longitude,
    pp.association_date,
    pp.association_type
FROM historic_person hp
LEFT JOIN person_place pp ON hp.person_id = pp.person_id
LEFT JOIN historic_place hpl ON pp.place_id = hpl.place_id
WHERE hpl.is_active = TRUE OR hpl.is_active IS NULL;

-- View: Events with their participants and locations
CREATE OR REPLACE VIEW v_event_details AS
SELECT 
    he.event_id,
    he.event_name,
    he.event_date,
    he.significance,
    he.event_description,
    STRING_AGG(DISTINCT hp.full_name, ', ') AS participants,
    STRING_AGG(DISTINCT hpl.place_name, ', ') AS locations
FROM historic_event he
LEFT JOIN event_person ep ON he.event_id = ep.event_id
LEFT JOIN historic_person hp ON ep.person_id = hp.person_id
LEFT JOIN event_place epl ON he.event_id = epl.event_id
LEFT JOIN historic_place hpl ON epl.place_id = hpl.place_id
GROUP BY he.event_id, he.event_name, he.event_date, he.significance, he.event_description;

-- View: Places with photo count
CREATE OR REPLACE VIEW v_place_photo_summary AS
SELECT 
    hp.place_id,
    hp.place_name,
    hp.latitude,
    hp.longitude,
    COUNT(pp.photo_id) AS photo_count,
    MAX(CASE WHEN pp.is_primary THEN p.file_path END) AS primary_photo_path
FROM historic_place hp
LEFT JOIN place_photo pp ON hp.place_id = pp.place_id
LEFT JOIN photo p ON pp.photo_id = p.photo_id
GROUP BY hp.place_id, hp.place_name, hp.latitude, hp.longitude;

-- =============================================
-- Utility Functions
-- =============================================

-- Function to get all events for a person
CREATE OR REPLACE FUNCTION get_person_events(p_person_id INTEGER)
RETURNS TABLE (
    event_id INTEGER,
    event_name VARCHAR,
    event_date DATE,
    role VARCHAR,
    significance significance_level
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        he.event_id,
        he.event_name,
        he.event_date,
        ep.role,
        he.significance
    FROM historic_event he
    JOIN event_person ep ON he.event_id = ep.event_id
    WHERE ep.person_id = p_person_id
    ORDER BY he.event_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get all people at a place during a specific time period
CREATE OR REPLACE FUNCTION get_people_at_place(
    p_place_id INTEGER,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    person_id INTEGER,
    full_name VARCHAR,
    association_date DATE,
    association_type VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        hp.person_id,
        hp.full_name,
        pp.association_date,
        pp.association_type
    FROM historic_person hp
    JOIN person_place pp ON hp.person_id = pp.person_id
    WHERE pp.place_id = p_place_id
        AND (p_start_date IS NULL OR pp.association_date >= p_start_date)
        AND (p_end_date IS NULL OR pp.association_date <= p_end_date)
    ORDER BY pp.association_date;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Sample Data for Testing (Optional - Remove in Production)
-- =============================================
/*
-- Sample photo
INSERT INTO photo (file_name, file_path, file_type, caption) VALUES
('washington.jpg', '/uploads/persons/washington.jpg', 'jpg', 'George Washington Portrait');

-- Sample person
INSERT INTO historic_person (first_name, last_name, dob, brief, biography, profile_photo_id) VALUES
('George', 'Washington', '1732-02-22', 'First President of the United States', 'Detailed biography here...', 1);

-- Sample place
INSERT INTO historic_place (place_name, latitude, longitude, date_start, brief, history) VALUES
('Mount Vernon', 38.7073, -77.0861, '1734-01-01', 'Washington''s plantation', 'Detailed history here...');

-- Sample event
INSERT INTO historic_event (event_name, event_date, event_description, significance) VALUES
('American Revolution', '1776-07-04', 'Declaration of Independence signed', 'GLOBAL');

-- Sample associations
INSERT INTO person_place (person_id, place_id, association_date, association_type) VALUES
(1, 1, '1754-01-01', 'Residence');

INSERT INTO event_person (event_id, person_id, role) VALUES
(1, 1, 'Commander-in-Chief');

INSERT INTO event_place (event_id, place_id) VALUES
(1, 1);
*/

-- =============================================
-- Maintenance and Performance Commands
-- =============================================

-- Analyze tables for query optimization (run periodically)
-- ANALYZE historic_person;
-- ANALYZE historic_place;
-- ANALYZE historic_event;
-- ANALYZE photo;

-- Create statistics for better query planning
-- CREATE STATISTICS person_name_stats (ndistinct) ON first_name, last_name FROM historic_person;
-- CREATE STATISTICS place_location_stats (ndistinct) ON latitude, longitude FROM historic_place;

-- =============================================
-- Security: Row Level Security (Optional)
-- =============================================
/*
-- Enable RLS on tables
ALTER TABLE historic_person ENABLE ROW LEVEL SECURITY;
ALTER TABLE historic_place ENABLE ROW LEVEL SECURITY;
ALTER TABLE historic_event ENABLE ROW LEVEL SECURITY;

-- Create policies based on your authentication system
-- Example: Allow all authenticated users to read, but only editors to write
CREATE POLICY person_read_policy ON historic_person FOR SELECT USING (true);
CREATE POLICY person_write_policy ON historic_person FOR ALL USING (current_user IN ('editor', 'admin'));
*/

-- =============================================
-- Grant Permissions (Adjust based on your user structure)
-- =============================================
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_user;