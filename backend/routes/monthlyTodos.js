const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/monthlyTodosController");
const v = require("../middleware/validators");

router.get("/",                ctrl.getAll);
router.post("/", v.createTodoRules, v.validate, ctrl.create);
router.put("/reorder", v.todoReorderRules, v.validate, ctrl.reorder);
router.put("/:id",  v.updateTodoRules, v.validate, ctrl.update);
router.delete("/:id", v.todoIdRules, v.validate, ctrl.remove);

module.exports = router;
