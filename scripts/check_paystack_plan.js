const https = require("https");
require("dotenv").config();

const options = {
  hostname: "api.paystack.co",
  port: 443,
  path: "/plan/PLN_op8wb4hoxs9v96b",
  method: "GET",
  headers: {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
  },
};

const req = https.request(options, (res) => {
  let data = "";
  res.on("data", (chunk) => {
    data += chunk;
  });
  res.on("end", () => {
    console.log(JSON.parse(data));
  });
});

req.on("error", (error) => {
  console.error(error);
});

req.end();
