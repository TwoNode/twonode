-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Table: parcel_entries
CREATE TABLE parcel_entries (
  id SERIAL PRIMARY KEY,
  plan_number VARCHAR(50) NOT NULL,
  survey_title TEXT NOT NULL,
  plan_type VARCHAR(50) NOT NULL,
  reference_plan_number VARCHAR(50),
  pillar_type VARCHAR(20) NOT NULL,
  deeded_area NUMERIC(10, 3) NOT NULL,
  facilitator TEXT NOT NULL,
  ward VARCHAR(100),
  lcda VARCHAR(100),
  lga VARCHAR(100),
  certificate_ready BOOLEAN,
  evidence_file_path TEXT,
  pdf_file_path TEXT,
  cad_file_path TEXT,
  geometry GEOMETRY(Polygon, 4326) NOT NULL,

  -- Audit trail
  creator TEXT NOT NULL,
  editor TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  edit_date TIMESTAMP
);

-- Table: pillars (1:M with parcel_entries)
CREATE TABLE pillars (
  id SERIAL PRIMARY KEY,
  parcel_id INTEGER NOT NULL REFERENCES parcel_entries(id) ON DELETE CASCADE,
  pillar_number VARCHAR(20) NOT NULL,
  pillar_type VARCHAR(50) NOT NULL,
  geometry GEOMETRY(Point, 4326) NOT NULL,

  -- Audit trail
  creator TEXT NOT NULL,
  editor TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  edit_date TIMESTAMP
);

-- Spatial Indexes
CREATE INDEX idx_parcel_geom ON parcel_entries USING GIST (geometry);
CREATE INDEX idx_pillar_coord ON pillars USING GIST (geometry);


-- B-tree Indexes
CREATE INDEX idx_parcel_plan_number ON parcel_entries(plan_number);
CREATE INDEX idx_parcel_survey_title ON parcel_entries(survey_title);
CREATE INDEX idx_pillar_number ON pillars(pillar_number);
