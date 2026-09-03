const express = require("express");
const bodyParser = require("body-parser");
const { Pool } = require("pg");

const app = express();
app.use(bodyParser.json());

// configure DB connection
const pool = new Pool({
  host: "revadb.cp284ay4ki61.eu-north-1.rds.amazonaws.com",
  user: "postgres",
  database: "twonode_db",
  password: "reva15p0stgres",
  port: 5432,
  ssl: { rejectUnauthorized: false } // if your RDS requires SSL
});

// POST /intersect
app.post("/intersect", async (req, res) => {
  try {
    const geom = JSON.stringify(req.body); // polygon geometry from frontend

    const query = `
      SELECT wardname, lcdaname, lganame, statename
      FROM nigeria_ward_admin_boundaries
      WHERE ST_Intersects(
        geom,
        ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)
      )
      LIMIT 1;
    `;

    const result = await pool.query(query, [geom]);

    if (result.rows.length > 0) {
      res.json({ success: true, data: result.rows[0] });
    } else {
      res.json({ success: false, message: "No intersection found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(3000, () => console.log("API running on http://localhost:3000"));
