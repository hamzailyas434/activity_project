const fs = require('fs');
const path = require('path');
const db = require('../config/database');

const COLORS = ['iris','teal','mineral','ochre','dusk','fog'];
const avatarColor = (id) => COLORS[((id - 1) % COLORS.length)];

// GET /api/admin/users?q=&role=all|admins|users|locked&page=&limit=
exports.listUsers = async (req, res) => {
  try {
    const q = String(req.query.q ?? req.query.search ?? '');
    const role = String(req.query.role || 'all');
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const like = `%${q}%`;
    const roleSql = {
      admins: "AND role IN ('owner','admin')",
      users: "AND role = 'user'",
      locked: 'AND lockout_until IS NOT NULL AND lockout_until > NOW()',
      demo: 'AND is_demo = 1',
    }[role] || '';
    const where = `WHERE (? = '' OR username LIKE ? OR email LIKE ? OR first_name LIKE ? OR last_name LIKE ?) ${roleSql}`;
    const params = [q, like, like, like, like];

    const [rows] = await db.query(
      `SELECT id, username, email, first_name, last_name, role, hidden_tabs, last_active, created_at,
              totp_enabled, lockout_until, failed_login_attempts, is_demo, demo_reset_at
       FROM users ${where}
       ORDER BY FIELD(role, 'owner', 'admin', 'user'), id ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [countRows] = await db.query(`SELECT COUNT(*) as total FROM users ${where}`, params);

    const now = Date.now();
    const users = rows.map(u => {
      let hidden_tabs = u.hidden_tabs;
      if (Buffer.isBuffer(hidden_tabs)) hidden_tabs = hidden_tabs.toString('utf8');
      if (typeof hidden_tabs === 'string') { try { hidden_tabs = JSON.parse(hidden_tabs); } catch { hidden_tabs = []; } }
      hidden_tabs = hidden_tabs || [];

      const lastActive = u.last_active ? new Date(u.last_active).getTime() : 0;
      const online = (now - lastActive) < 5 * 60 * 1000;
      const locked = !!u.lockout_until && new Date(u.lockout_until).getTime() > now;

      return { ...u, hidden_tabs, online, locked, totp_enabled: !!u.totp_enabled, color: avatarColor(u.id) };
    });

    res.json({ users, total: countRows[0].total, page, limit });
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
    const [[{ locked }]] = await db.query('SELECT COUNT(*) as locked FROM users WHERE lockout_until > NOW()');
    const [[{ totp }]] = await db.query('SELECT COUNT(*) as totp FROM users WHERE totp_enabled = 1');
    res.json({ total, admins, users, online, locked, totp });
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
    if (rows[0].role === 'admin' && req.user.role !== 'owner') return res.status(403).json({ error: 'Only the owner can edit an admin' });

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

    // Book tables have no foreign key to users, so clear them (and the files on disk) by hand
    const [books] = await db.query('SELECT file_path FROM books WHERE user_id = ?', [targetId]);
    for (const t of ['book_favourite_pages', 'book_highlights', 'book_page_notes', 'book_progress', 'books', 'reading_goals']) {
      await db.query(`DELETE FROM ${t} WHERE user_id = ?`, [targetId]);
    }
    await db.query('DELETE FROM users WHERE id = ?', [targetId]);
    for (const b of books) {
      try { fs.unlinkSync(path.join(__dirname, '..', b.file_path)); } catch { /* already gone */ }
    }
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
    // Admins may promote users; only the owner can demote an admin
    if (rows[0].role === 'admin' && role === 'user' && req.user.role !== 'owner') return res.status(403).json({ error: 'Only the owner can revoke admin' });

    await db.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    res.json({ success: true, role });
  } catch (err) {
    console.error('adminController.updateRole error:', err);
    res.status(500).json({ error: 'Failed to update role' });
  }
};

// POST /api/admin/users/:id/unlock — clears lockout_until and failed_login_attempts
exports.unlockUser = async (req, res) => {
  try {
    const [r] = await db.query(
      'UPDATE users SET lockout_until = NULL, failed_login_attempts = 0 WHERE id = ?',
      [req.params.id]
    );
    if (!r.affectedRows) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('adminController.unlockUser error:', err);
    res.status(500).json({ error: 'Failed to unlock user' });
  }
};

// GET /api/admin/audit?page=&limit= (owner only)
exports.getAudit = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const [rows] = await db.query(
      `SELECT a.id, a.action, a.resource, a.ip_address, a.status_code, a.created_at, u.username
       FROM audit_log a LEFT JOIN users u ON u.id = a.user_id
       ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,
      [limit, (page - 1) * limit]
    );
    res.json({ rows, page, limit });
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') return res.json({ rows: [], page: 1, limit: 50 });
    console.error('adminController.getAudit error:', err);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
};

// POST /api/admin/users/:id/demo-reset — put a demo account back to the demo data
exports.resetDemo = async (req, res) => {
  try {
    await require("../utils/demoSeed").resetDemoUser(parseInt(req.params.id, 10));
    res.json({ message: "Demo content reset" });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message });
    console.error("resetDemo error:", err);
    res.status(500).json({ error: "Failed to reset demo content" });
  }
};

// POST /api/admin/demo-accounts — add one more demo account to the pool
exports.createDemo = async (req, res) => {
  try {
    const u = await require("../utils/demoSeed").createDemoUser();
    res.status(201).json(u);
  } catch (err) {
    console.error("createDemo error:", err);
    res.status(500).json({ error: "Failed to create demo account" });
  }
};
