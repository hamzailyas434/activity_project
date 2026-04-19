const express = require("express");
const router = express.Router();
const c = require("../controllers/favouriteProfilesController");

// Sub-resource deletes must come before /:id to avoid param capture
router.delete("/records/:id", c.deleteRecord);
router.delete("/categories/:id", c.deleteCategory);
router.put("/categories/:id", c.updateCategory);

router.get("/", c.getProfiles);
router.post("/", c.createProfile);
router.put("/:id", c.updateProfile);
router.delete("/:id", c.deleteProfile);
router.get("/:id/records", c.getRecords);
router.post("/:id/records", c.upsertRecord);
router.get("/:id/categories", c.getCategories);
router.post("/:id/categories", c.createCategory);

module.exports = router;
