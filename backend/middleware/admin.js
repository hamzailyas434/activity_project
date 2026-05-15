const requireOwner = (req, res, next) => {
  if (req.user?.role !== 'owner') return res.status(403).json({ error: 'Owner access required' });
  next();
};

module.exports = { requireOwner };
