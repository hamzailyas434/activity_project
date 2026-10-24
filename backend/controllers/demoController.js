const { claimDemoUser } = require("../utils/demoSeed");
const { issueTokens } = require("./tokenController");

// POST /api/users/demo-login — open a demo account without a password
exports.demoLogin = async (req, res) => {
  try {
    const u = await claimDemoUser();
    if (!u) return res.status(503).json({ error: "The demo isn't available right now" });
    let ht = u.hidden_tabs;
    if (Buffer.isBuffer(ht)) ht = ht.toString("utf8");
    if (typeof ht === "string") { try { ht = JSON.parse(ht); } catch { ht = []; } }
    await issueTokens({ ...u, is_demo: 1, hidden_tabs: Array.isArray(ht) ? ht : [] }, res, req.ip, req.headers["user-agent"]);
  } catch (err) {
    console.error("demoLogin error:", err);
    res.status(500).json({ error: "Couldn't open the demo" });
  }
};
