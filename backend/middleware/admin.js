const requireOwner = (req, res, next) => {
  if (req.user?.role !== 'owner') return res.status(403).json({ error: 'Owner access required' });
  next();
};

// Owner or admin
const requireAdmin = (req, res, next) => {
  if (!['owner', 'admin'].includes(req.user?.role)) return res.status(403).json({ error: 'Admin access required' });
  next();
};

module.exports = { requireOwner, requireAdmin };
