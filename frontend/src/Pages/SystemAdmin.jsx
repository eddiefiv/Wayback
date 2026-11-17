import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getAdminReport,
  getAdminUser,
  getAdminUsers,
  updateAdminUser
} from "../api.js";
import "./css/SystemAdmin.css";

const roleLabels = {
  community: "Community User",
  security_staff: "Security Staff",
  system_administrator: "System Administrator"
};

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function SystemAdmin({ token, section = "" }) {
  const { userId } = useParams();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reportType, setReportType] = useState("");
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      setNotFound(false);
      try {
        const usersData = await getAdminUsers(token);
        if (active) setUsers(usersData);

        if (userId) {
          const user = await getAdminUser(userId, token);
          if (active) {
            setSelectedUser(user);
            setForm({
              role: user.role,
              can_post: user.can_post,
              can_claim: user.can_claim
            });
          }
        } else if (active) {
          setSelectedUser(null);
          setForm(null);
        }
      } catch (requestError) {
        console.error("Could not load system administration data:", requestError);
        if (active) {
          if (userId && requestError.message === "User not found.") {
            setNotFound(true);
          } else {
            setError(requestError.message || "Could not load system administration data.");
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [token, userId]);

  async function handleSave(event) {
    event.preventDefault();
    if (!selectedUser || !form) return;

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const updatedUser = await updateAdminUser(selectedUser.id, form, token);
      setSelectedUser(updatedUser);
      setUsers((current) =>
        current.map((user) => user.id === updatedUser.id ? updatedUser : user)
      );
      setForm({
        role: updatedUser.role,
        can_post: updatedUser.can_post,
        can_claim: updatedUser.can_claim
      });
      setEditing(false);
      setMessage("User permissions updated.");
    } catch (requestError) {
      console.error("Could not update user permissions:", requestError);
      setError(requestError.message || "Could not update user permissions.");
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateReport(event) {
    event.preventDefault();
    setError("");
    setReport(null);

    if (!reportType) {
      setError("Select a report type before generating a report.");
      return;
    }

    setReportLoading(true);
    try {
      setReport(await getAdminReport(reportType, token));
    } catch (requestError) {
      console.error("Could not generate item report:", requestError);
      setError(requestError.message || "Could not generate the report.");
    } finally {
      setReportLoading(false);
    }
  }

  function exportReport() {
    if (!report) return;
    const header = ["Item type", "Status", "Location", "Listing count"];
    const rows = report.rows.map((row) => [
      row.item_type,
      row.status,
      row.location_text,
      row.listing_count
    ]);
    const content = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `wayback-${report.type}-report.csv`;
    anchor.hidden = true;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  if (loading) {
    return <main className="admin-page"><p>Loading administration console...</p></main>;
  }

  if (notFound) {
    return (
      <main className="admin-page">
        <section className="admin-panel not-found-panel">
          <p className="admin-eyebrow">404 · Not found</p>
          <h1>User not found</h1>
          <p>This user may have been removed or the address may be incorrect.</p>
          <Link className="admin-button-link" to="/admin">Back to System Administration</Link>
        </section>
      </main>
    );
  }

  if (error && !users.length && !section && !userId) {
    return (
      <main className="admin-page">
        <p className="error-message" role="alert">{error}</p>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">WayBack · Administration</p>
          <h1>System Administration Console</h1>
          <p>Manage community access and review lost and found activity.</p>
        </div>
      </div>

      <nav className="admin-tabs" aria-label="System administration sections">
        <Link className={!section ? "active" : ""} to="/admin">Users &amp; permissions</Link>
        <Link className={section === "reports" ? "active" : ""} to="/admin/reports">Generate Reports</Link>
      </nav>

      {error && <p className="error-message admin-message" role="alert">{error}</p>}
      {message && <p className="success-message admin-message" role="status">{message}</p>}

      {section === "reports" ? (
        <section className="admin-panel report-panel">
          <div className="admin-section-heading">
            <div>
              <p className="admin-eyebrow">Analytics</p>
              <h2>Generate Reports</h2>
              <p>Summarize active lost and found listings by status and location.</p>
            </div>
          </div>
          <form className="report-form" onSubmit={handleGenerateReport}>
            <label htmlFor="report-type">Report type</label>
            <div className="report-controls">
              <select id="report-type" value={reportType} onChange={(event) => setReportType(event.target.value)}>
                <option value="">Select a report type</option>
                <option value="lost">Lost items</option>
                <option value="found">Found items</option>
                <option value="all">All listings</option>
              </select>
              <button type="submit" disabled={reportLoading}>
                {reportLoading ? "Generating..." : "Generate"}
              </button>
            </div>
          </form>

          {report && (
            <section className="report-results" aria-live="polite">
              <div className="report-results-heading">
                <div>
                  <h3>{roleLabels[report.type] || (report.type === "all" ? "All Listings" : `${report.type} items`)} Report</h3>
                  <p>{report.rows.length} summary row{report.rows.length === 1 ? "" : "s"}</p>
                </div>
                <button type="button" className="secondary-button" onClick={exportReport}>Export CSV</button>
              </div>
              {report.rows.length === 0 ? (
                <p>No active listings match this report.</p>
              ) : (
                <div className="report-table-wrap">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Location</th>
                        <th>Listings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.rows.map((row, index) => (
                        <tr key={`${row.item_type}-${row.status}-${row.location_text}-${index}`}>
                          <td>{row.item_type}</td>
                          <td>{row.status}</td>
                          <td>{row.location_text}</td>
                          <td>{row.listing_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </section>
      ) : (
        <div className="admin-layout">
          <section className="admin-panel admin-users-panel">
            <div className="admin-section-heading">
              <div>
                <p className="admin-eyebrow">Access management</p>
                <h2>Users</h2>
              </div>
              <span className="admin-count">{users.length}</span>
            </div>
            {users.length === 0 ? (
              <p>No user accounts found.</p>
            ) : (
              <div className="admin-user-list">
                {users.map((user) => (
                  <Link
                    className={`admin-user-link ${String(user.id) === userId ? "selected" : ""}`}
                    to={`/admin/users/${user.id}`}
                    key={user.id}
                  >
                    <span className="admin-user-avatar">{user.name?.charAt(0)?.toUpperCase() || "U"}</span>
                    <span className="admin-user-meta">
                      <strong>{user.name}</strong>
                      <small>{user.email}</small>
                      <span className="admin-role-badge">{roleLabels[user.role] || user.role}</span>
                    </span>
                    <span className="admin-user-arrow" aria-hidden="true">›</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="admin-panel admin-user-detail">
            {selectedUser && form ? (
              <>
                <div className="admin-section-heading">
                  <div>
                    <p className="admin-eyebrow">Account permissions</p>
                    <h2>{selectedUser.name}</h2>
                    <p>{selectedUser.email}</p>
                  </div>
                  {!editing && (
                    <button type="button" onClick={() => setEditing(true)}>Edit Permissions</button>
                  )}
                </div>
                {editing ? (
                  <form className="permissions-form" onSubmit={handleSave}>
                    <label htmlFor="user-role">User role</label>
                    <select
                      id="user-role"
                      value={form.role}
                      onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                    >
                      {Object.entries(roleLabels).map(([role, label]) => (
                        <option value={role} key={role}>{label}</option>
                      ))}
                    </select>
                    <fieldset>
                      <legend>Community permissions</legend>
                      <label className="permission-toggle">
                        <input
                          type="checkbox"
                          checked={form.can_post}
                          onChange={(event) => setForm((current) => ({ ...current, can_post: event.target.checked }))}
                        />
                        <span><strong>Post and edit listings</strong><small>Allow this user to create and edit their listings.</small></span>
                      </label>
                      <label className="permission-toggle">
                        <input
                          type="checkbox"
                          checked={form.can_claim}
                          onChange={(event) => setForm((current) => ({ ...current, can_claim: event.target.checked }))}
                        />
                        <span><strong>Submit claims</strong><small>Allow this user to claim found items.</small></span>
                      </label>
                    </fieldset>
                    <div className="admin-form-actions">
                      <button type="button" className="secondary-button" onClick={() => {
                        setForm({
                          role: selectedUser.role,
                          can_post: selectedUser.can_post,
                          can_claim: selectedUser.can_claim
                        });
                        setEditing(false);
                      }}>
                        Cancel
                      </button>
                      <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Permissions"}</button>
                    </div>
                  </form>
                ) : (
                  <div className="permission-summary">
                    <div><span>Role</span><strong>{roleLabels[selectedUser.role] || selectedUser.role}</strong></div>
                    <div><span>Post and edit listings</span><strong>{selectedUser.can_post ? "Allowed" : "Disabled"}</strong></div>
                    <div><span>Submit claims</span><strong>{selectedUser.can_claim ? "Allowed" : "Disabled"}</strong></div>
                  </div>
                )}
              </>
            ) : (
              <div className="admin-empty-state">
                <span aria-hidden="true">↖</span>
                <h2>Select a user</h2>
                <p>Choose an account from the list to view and edit its permissions.</p>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

export default SystemAdmin;
