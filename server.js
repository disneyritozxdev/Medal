const express = require("express");
const path = require("path");
const clipHandler = require("./api/clip");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.static(path.join(__dirname)));
app.get("/api/clip", clipHandler);

app.listen(PORT, () => {
  console.log("running at http://localhost:" + PORT);
});
