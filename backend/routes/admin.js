const router = require('express').Router();
const c = require('../controllers/adminController');
const { requireOwner } = require('../middleware/admin');

// Mounted behind requireAdmin (owner + admin). Owner-only actions are marked.
router.get('/users', c.listUsers);
router.get('/stats', c.getStats);
router.put('/users/:id/tabs', c.updateTabs);
router.patch('/users/:id/tabs', c.updateTabs);
router.put('/users/:id/role', c.updateRole);
router.patch('/users/:id/role', c.updateRole);
router.post('/users/:id/unlock', c.unlockUser);
router.post('/users/:id/demo-reset', c.resetDemo);
router.post('/demo-accounts', c.createDemo);
router.delete('/users/:id', requireOwner, c.deleteUser);
router.get('/audit', requireOwner, c.getAudit);

module.exports = router;
