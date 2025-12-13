const express = require("express");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const wellknown = require("wellknown");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const port = 3000;

// Configure multer storage (files will be stored in the "uploads" folder)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Ensure directories exist for PDFs and CAD files
    let uploadDir = "uploads";
    if (file.fieldname === "pdf") {
      uploadDir = path.join(uploadDir, "pdf");
    } else if (file.fieldname === "cad") {
      uploadDir = path.join(uploadDir, "cad");
    }
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Name the file uniquely
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  }
});
const upload = multer({ storage: storage });

// For JSON bodies on non-file uploads
app.use(bodyParser.json());

const pool = new Pool({
  user: "your_user",
  host: "localhost",
  database: "your_database",
  password: "your_password",
  port: 5432
});

// Convert Esri JSON polygon (with 'rings') to GeoJSON
function esriToGeoJSON(esriGeom) {
  return {
    type: "Polygon",
    coordinates: esriGeom.rings
  };
}

// Updated /submit route to handle multipart form data with file uploads
app.post("/submit", upload.fields([
  { name: "pdf", maxCount: 1 },
  { name: "cad", maxCount: 1 }
]), async (req, res) => {
  try {
    // The non-file data is expected in req.body.data as a JSON string
    const data = JSON.parse(req.body.data || "{}");
    const { geometry, attributes, pillars } = data;

    if (!geometry || !attributes || !Array.isArray(pillars)) {
      return res.status(400).json({ error: "Missing required data" });
    }

    // Get file paths (if uploaded)
    const pdfPath = req.files["pdf"] ? req.files["pdf"][0].path : null;
    const cadPath = req.files["cad"] ? req.files["cad"][0].path : null;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Convert parcel polygon from Esri JSON to WKT
      const geoJSON = esriToGeoJSON(geometry);
      const parcelWKT = wellknown.stringify(geoJSON);

      const insertParcel = `
        INSERT INTO parcels (
          geom, plan_number, survey_title, plan_type, reference_plan_number,
          deeded_area, facilitator, pillar_type, certificate_ready,
          ward, lcda, lga,
          pdf_file_path, cad_file_path,
          created_by, modified_by
        ) VALUES (
          ST_GeomFromText($1, 4326), $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12,
          $13, $14,
          $15, $16
        ) RETURNING id
      `;

      const parcelValues = [
        parcelWKT,
        attributes.PlanNumber,
        attributes.SurveyTitle,
        attributes.PlanType,
        attributes.ReferencePlanNumber || null,
        attributes.DeededArea,
        attributes.Facilitator,
        attributes.PillarType,
        attributes.CertificateReady,
        attributes.WARD,
        attributes.LCDA,
        attributes.LGA,
        pdfPath,
        cadPath,
        "admin_user", // Replace with actual authenticated user (created_by)
        "admin_user"  // Replace with actual authenticated user (modified_by)
      ];

      const parcelRes = await client.query(insertParcel, parcelValues);
      const parcelId = parcelRes.rows[0].id;

      // Insert each pillar into the pillars table
      const insertPillar = `
        INSERT INTO pillars (
          parcel_id, geom, easting, northing, point_index, pillar_number,
          created_by, modified_by
        ) VALUES (
          $1, ST_GeomFromText($2, 4326), $3, $4, $5, $6,
          $7, $8
        )
      `;

      for (const pt of pillars) {
        // Convert point to WKT
        const pointWKT = wellknown.stringify({
          type: "Point",
          coordinates: [pt.x, pt.y]
        });
        await client.query(insertPillar, [
          parcelId,
          pointWKT,
          pt.x,
          pt.y,
          pt.index,
          pt.pillarNumber,
          "admin_user",  // created_by field for pillar; update with authenticated user if needed
          "admin_user"   // modified_by
        ]);
      }

      await client.query("COMMIT");
      res.status(200).json({ message: "Uploaded", parcelId });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Upload error:", err);
      res.status(500).json({ error: "Upload failed" });
    } finally {
      client.release();
    }
  } catch (e) {
    console.error("Error processing request:", e);
    res.status(400).json({ error: "Invalid request format" });
  }
});

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
