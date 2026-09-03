-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

--1. parcels Table---

CREATE TABLE parcels (
  id SERIAL PRIMARY KEY,
  geom geometry(Polygon, 4326),
  area_sq_m DOUBLE PRECISION,
  centroid geometry(Point, 4326),

  plan_number TEXT NOT NULL,
  survey_title TEXT NOT NULL,
  plan_type TEXT NOT NULL,
  reference_plan_number TEXT,
  deeded_area TEXT NOT NULL,
  facilitator TEXT NOT NULL,
  pillar_type TEXT NOT NULL,
  certificate_ready TEXT,

  ward TEXT,
  lcda TEXT,
  lga TEXT,

  pdf_file_path TEXT,
  cad_file_path TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  modified_by TEXT
);

--2. pillars Table---

CREATE TABLE pillars (
  id SERIAL PRIMARY KEY,
  parcel_id INTEGER NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  geom geometry(Point, 4326),

  easting DOUBLE PRECISION,
  northing DOUBLE PRECISION,
  point_index INTEGER,
  pillar_number TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  modified_by TEXT
);

--3.Triggers for Area & Centroid Auto-Update--
--3a. Function to compute area and centroid:---

CREATE OR REPLACE FUNCTION update_parcel_geometry_details()
RETURNS TRIGGER AS $$
BEGIN
  NEW.area_sq_m := ST_Area(NEW.geom::geography);
  NEW.centroid := ST_Centroid(NEW.geom);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

--3b. Trigger to call it on insert/update:

CREATE TRIGGER trg_update_parcel_geometry
BEFORE INSERT OR UPDATE ON parcels
FOR EACH ROW
EXECUTE FUNCTION update_parcel_geometry_details();



--4. Triggers for Audit Tracking--
--(You can optionally feed current_user or pass the value from your backend.)---

---4a. Audit fields update trigger:--

CREATE OR REPLACE FUNCTION update_modified_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- 4b. Apply to both tables:---
CREATE TRIGGER trg_update_parcels_audit
BEFORE UPDATE ON parcels
FOR EACH ROW
EXECUTE FUNCTION update_modified_timestamp();

CREATE TRIGGER trg_update_pillars_audit
BEFORE UPDATE ON pillars
FOR EACH ROW
EXECUTE FUNCTION update_modified_timestamp();


-- 5 Spatial Indexes
CREATE INDEX idx_parcels_geom ON parcels USING GIST (geom);
CREATE INDEX idx_parcels_centroid ON parcels USING GIST (centroid);
CREATE INDEX idx_pillars_geom ON pillars USING GIST (geom);

--File Storage (i guess this S3 bucket thing)
-- this js---

await client.query(`
  UPDATE parcels SET pdf_file_path = $1, cad_file_path = $2 WHERE id = $3
`, [`uploads/pdf/plan123.pdf`, `uploads/cad/plan123.dwg`, `uploads/certificate/plan123.pdf`, parcelId]);
