const express = require("express");
const router = express.Router();
const c = require("../controllers/favouriteProfilesController");
const v = require("../middleware/validators");

// Sub-resource deletes must come before /:id to avoid param capture
router.delete("/records/:id",           v.recordIdRules, v.validate, c.deleteRecord);
router.delete("/categories/:id",        v.categoryRules, v.validate, c.deleteCategory);
router.put("/categories/:id",           v.categoryUpdateRules, v.validate, c.updateCategory);

router.get("/",                              c.getProfiles);
router.post("/",          v.createProfileRules, v.validate, c.createProfile);
router.put("/:id",        v.updateProfileRules, v.validate, c.updateProfile);
router.delete("/:id",     v.profileIdRules, v.validate, c.deleteProfile);
router.get("/:id/records",                   c.getRecords);
router.post("/:id/records", v.upsertRecordRules, v.validate, c.upsertRecord);
router.get("/:id/categories",                c.getCategories);
router.post("/:id/categories",               c.createCategory);

module.exports = router;
