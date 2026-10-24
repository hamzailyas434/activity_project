const express = require("express");
const router = express.Router();
const expensesController = require("../controllers/expensesController");
const v = require("../middleware/validators");

// Budget routes — before /:id to avoid param capture
router.get("/budget",  expensesController.getBudget);
router.post("/budget", v.budgetRules, v.validate, expensesController.upsertBudget);

// Person ledger
router.get("/ledger",        expensesController.getLedger);
router.post("/ledger",       expensesController.upsertLedger);
router.put("/ledger/:id",    v.expenseIdRules, v.validate, expensesController.updateLedger);
router.delete("/ledger/:id", v.expenseIdRules, v.validate, expensesController.deleteLedger);

// Expense CRUD
router.get("/",       expensesController.getExpenses);
router.post("/",      v.createExpenseRules, v.validate, expensesController.createExpense);
router.put("/:id",    v.expenseIdRules, v.validate, expensesController.updateExpense);
router.delete("/:id", v.expenseIdRules, v.validate, expensesController.deleteExpense);

module.exports = router;
