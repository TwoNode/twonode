app.get('/api/user-properties', async (req, res) => {
  const userId = req.user.id; // assuming you use JWT or session

  const result = await db.query(`
    SELECT id, name,
      ST_X(location::geometry) AS longitude,
      ST_Y(location::geometry) AS latitude
    FROM "Property"
    WHERE user_id = $1
  `, [userId]);

  res.json(result.rows);
});
