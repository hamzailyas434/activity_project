const express = require("express");
const router = express.Router();
const taskController = require("../controllers/taskController");
const v = require("../middleware/validators");

router.get("/",       taskController.getTasksByDate);
router.post("/",      v.createTaskRules, v.validate, taskController.addTask);
router.put("/:id",    v.taskIdRules, v.validate, taskController.updateTask);
router.delete("/:id", v.taskIdRules, v.validate, taskController.deleteTask);

module.exports = router;
