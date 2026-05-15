const router = require('express').Router();
const c = require('../controllers/adminController');
const { requireOwner } = require('../middleware/admin');

router.get('/users', c.listUsers);
router.get('/stats', c.getStats);
router.put('/users/:id/tabs', c.updateTabs);
router.put('/users/:id/role', requireOwner, c.updateRole);
router.delete('/users/:id', requireOwner, c.deleteUser);

module.exports = router;
