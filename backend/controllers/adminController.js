const db = require('../config/database');

const COLORS = ['iris','teal','mineral','ochre','dusk','fog'];
const avatarColor = (id) => COLORS[((id - 1) % COLORS.length)];

// GET /api/admin/users
exports.listUsers = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const like = `%${search}%`;

    const [rows] = await db.query(
      `SELECT id, username, email, role, hidden_tabs, last_active, created_at
       FROM users
       WHERE (? = '' OR username LIKE ? OR email LIKE ?)
       ORDER BY id ASC
       LIMIT ? OFFSET ?`,
      [search, like, like, parseInt(limit), offset]
    );

    const [countRows] = await db.query(
      `SELECT COUNT(*) as total FROM users WHERE (? = '' OR username LIKE ? OR email LIKE ?)`,
      [search, like, like]
    );

    const now = Date.now();
    const users = rows.map(u => {
      let hidden_tabs = u.hidden_tabs;
      if (Buffer.isBuffer(hidden_tabs)) hidden_tabs = hidden_tabs.toString('utf8');
      if (typeof hidden_tabs === 'string') { try { hidden_tabs = JSON.parse(hidden_tabs); } catch { hidden_tabs = []; } }
      hidden_tabs = hidden_tabs || [];

      const lastActive = u.last_active ? new Date(u.last_active).getTime() : 0;
      const online = (now - lastActive) < 5 * 60 * 1000;

      return { ...u, hidden_tabs, online, color: avatarColor(u.id) };
    });

    res.json({ users, total: countRows[0].total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('adminController.listUsers error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// GET /api/admin/stats
exports.getStats = async (req, res) => {
  try {
    const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM users');
    const [[{ admins }]] = await db.query("SELECT COUNT(*) as admins FROM users WHERE role IN ('admin','owner')");
    const [[{ users }]] = await db.query("SELECT COUNT(*) as users FROM users WHERE role = 'user'");
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const [[{ online }]] = await db.query('SELECT COUNT(*) as online FROM users WHERE last_active > ?', [fiveMinAgo]);
    res.json({ total, admins, users, online });
  } catch (err) {
    console.error('adminController.getStats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

// PUT /api/admin/users/:id/tabs
exports.updateTabs = async (req, res) => {
  try {
    const { id } = req.params;
    const { hidden_tabs } = req.body;
    if (!Array.isArray(hidden_tabs)) return res.status(400).json({ error: 'hidden_tabs must be an array' });

    // Cannot edit self
    if (parseInt(id) === req.user.id) return res.status(403).json({ error: 'Cannot edit your own tabs' });

    const [rows] = await db.query('SELECT role FROM users WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    if (rows[0].role === 'owner') return res.status(403).json({ error: 'Cannot edit owner tabs' });

    await db.query('UPDATE users SET hidden_tabs = ? WHERE id = ?', [JSON.stringify(hidden_tabs), id]);
    res.json({ success: true, hidden_tabs });
  } catch (err) {
    console.error('adminController.updateTabs error:', err);
    res.status(500).json({ error: 'Failed to update tabs' });
  }
};

// DELETE /api/admin/users/:id
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const targetId = parseInt(id);

    if (targetId === req.user.id) return res.status(403).json({ error: 'Cannot delete your own account' });

    const [rows] = await db.query('SELECT role FROM users WHERE id = ?', [targetId]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    if (rows[0].role === 'owner') return res.status(403).json({ error: 'Cannot delete owner account' });

    await db.query('DELETE FROM users WHERE id = ?', [targetId]);
    res.json({ success: true });
  } catch (err) {
    console.error('adminController.deleteUser error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// PUT /api/admin/users/:id/role
exports.updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!['admin', 'user'].includes(role)) return res.status(400).json({ error: 'Role must be admin or user' });

    if (parseInt(id) === req.user.id) return res.status(403).json({ error: 'Cannot change your own role' });

    const [rows] = await db.query('SELECT role FROM users WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    if (rows[0].role === 'owner') return res.status(403).json({ error: 'Cannot change owner role' });

    await db.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    res.json({ success: true, role });
  } catch (err) {
    console.error('adminController.updateRole error:', err);
    res.status(500).json({ error: 'Failed to update role' });
  }
};
