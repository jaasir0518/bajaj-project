import { useState } from 'react';
import './App.css';

const parseEntries = (value) =>
  value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

const formatApiError = async (res) => {
  try {
    const data = await res.json();
    return data.error || `API error: ${res.status}`;
  } catch {
    return `API error: ${res.status}`;
  }
};

function App() {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const entries = parseEntries(input);
  const apiUrl = import.meta.env.VITE_API_URL || '/bfhl';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: entries }),
      });

      if (!res.ok) {
        throw new Error(await formatApiError(res));
      }

      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setError(err.message || 'Something went wrong while contacting the API.');
    } finally {
      setLoading(false);
    }
  };

  const renderTree = (tree) => {
    if (!tree || typeof tree !== 'object' || Object.keys(tree).length === 0) {
      return null;
    }

    return (
      <ul className="tree-list">
        {Object.entries(tree).map(([node, children]) => (
          <li key={node} className="tree-node">
            <div className="tree-node-row">
              <span className="tree-branch" aria-hidden="true">
                {'->'}
              </span>
              <span className="node-label">{node}</span>
            </div>
            {renderTree(children)}
          </li>
        ))}
      </ul>
    );
  };

  const issueCount =
    (response?.invalid_entries?.length || 0) + (response?.duplicate_edges?.length || 0);

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">BFHL hierarchy visualizer</p>
          <h1>Frontend aligned to the backend contract.</h1>
          <p className="hero-text">
            Paste relationships, call the API, and review the exact backend output as trees,
            cycle reports, duplicate edges, and invalid entries.
          </p>
        </div>

        <div className="hero-panel">
          <div className="hero-stat">
            <span className="hero-stat-value">{entries.length}</span>
            <span className="hero-stat-label">parsed edges ready to send</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-value">{response?.hierarchies?.length ?? 0}</span>
            <span className="hero-stat-label">hierarchies returned</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-value">{issueCount}</span>
            <span className="hero-stat-label">duplicate or invalid entries</span>
          </div>
        </div>
      </section>

      <section className="workspace">
        <form onSubmit={handleSubmit} className="panel composer">
          <div className="panel-header">
            <div>
              <p className="section-kicker">Request builder</p>
              <h2>Send live BFHL input</h2>
            </div>
          </div>

          <div className="chip-row">
            <span className="chip">Format: A-&gt;B</span>
            <span className="chip">Comma or newline separated</span>
            <span className="chip">Endpoint: {apiUrl}</span>
          </div>

          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="A->B&#10;A->C&#10;B->D"
            rows={12}
            className="input-textarea"
          />

          <div className="composer-footer">
            <div className="request-meta">
              <span>{entries.length} entries</span>
              <span>{new Set(entries).size} unique raw values</span>
            </div>
            <button type="submit" disabled={loading || entries.length === 0} className="submit-btn">
              {loading ? 'Processing...' : 'Process hierarchies'}
            </button>
          </div>
        </form>

        <div className="results-column">
          {error && (
            <section className="panel error-panel">
              <p className="section-kicker">Request failed</p>
              <h2>Backend returned an error</h2>
              <p>{error}</p>
            </section>
          )}

          {response ? (
            <>
              <section className="panel overview">
                <div className="panel-header">
                  <div>
                    <p className="section-kicker">Response overview</p>
                    <h2>What the backend produced</h2>
                  </div>
                  <span className={`status-pill ${response.has_cycle ? 'warn' : 'ok'}`}>
                    {response.has_cycle ? 'Cycle detected' : 'Tree-only response'}
                  </span>
                </div>

                <div className="stat-grid">
                  <article className="metric-card">
                    <span className="metric-value">{response.summary.total_trees}</span>
                    <span className="metric-label">valid trees</span>
                  </article>
                  <article className="metric-card">
                    <span className="metric-value">{response.summary.total_cycles}</span>
                    <span className="metric-label">cycles</span>
                  </article>
                  <article className="metric-card">
                    <span className="metric-value">{response.summary.largest_tree_root || 'N/A'}</span>
                    <span className="metric-label">largest tree root</span>
                  </article>
                  <article className="metric-card">
                    <span className="metric-value">{response.hierarchies.length}</span>
                    <span className="metric-label">components returned</span>
                  </article>
                </div>

                <div className="identity-grid">
                  <div className="identity-card">
                    <span className="identity-label">User ID</span>
                    <strong>{response.user_id}</strong>
                  </div>
                  <div className="identity-card">
                    <span className="identity-label">Email</span>
                    <strong>{response.email_id}</strong>
                  </div>
                  <div className="identity-card">
                    <span className="identity-label">Roll number</span>
                    <strong>{response.college_roll_number}</strong>
                  </div>
                </div>
              </section>

              <section className="panel">
                <div className="panel-header">
                  <div>
                    <p className="section-kicker">Hierarchy output</p>
                    <h2>Connected components</h2>
                  </div>
                </div>

                <div className="hierarchy-grid">
                  {response.hierarchies.map((hierarchy, index) => (
                    <article
                      key={`${hierarchy.root}-${index}`}
                      className={`hierarchy-card ${hierarchy.has_cycle ? 'cycle' : 'tree'}`}
                    >
                      <div className="hierarchy-top">
                        <div>
                          <p className="hierarchy-title">Root {hierarchy.root}</p>
                          <p className="hierarchy-subtitle">
                            {hierarchy.has_cycle
                              ? 'Cycle-only component'
                              : `Tree depth ${hierarchy.depth}`}
                          </p>
                        </div>
                        <span className={`mini-badge ${hierarchy.has_cycle ? 'warn' : 'ok'}`}>
                          {hierarchy.has_cycle ? 'cycle' : 'tree'}
                        </span>
                      </div>

                      <div className="tree-container">
                        {hierarchy.has_cycle ? (
                          <p className="cycle-message">
                            This component is cyclic, so the backend returned an empty tree object.
                          </p>
                        ) : (
                          renderTree(hierarchy.tree)
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="issue-grid">
                <article className="panel issue-panel">
                  <div className="panel-header">
                    <div>
                      <p className="section-kicker">Validation</p>
                      <h2>Invalid entries</h2>
                    </div>
                    <span className="count-pill">{response.invalid_entries.length}</span>
                  </div>

                  {response.invalid_entries.length > 0 ? (
                    <div className="tag-list">
                      {response.invalid_entries.map((entry, index) => (
                        <span key={`${entry}-${index}`} className="tag invalid">
                          {entry || '(empty string)'}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-state">No invalid entries in this request.</p>
                  )}
                </article>

                <article className="panel issue-panel">
                  <div className="panel-header">
                    <div>
                      <p className="section-kicker">Deduplication</p>
                      <h2>Duplicate edges</h2>
                    </div>
                    <span className="count-pill">{response.duplicate_edges.length}</span>
                  </div>

                  {response.duplicate_edges.length > 0 ? (
                    <div className="tag-list">
                      {response.duplicate_edges.map((edge, index) => (
                        <span key={`${edge}-${index}`} className="tag duplicate">
                          {edge}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-state">No duplicate edges detected.</p>
                  )}
                </article>
              </section>
            </>
          ) : (
            <section className="panel empty-results">
              <p className="section-kicker">Response panel</p>
              <h2>Submit real input to see the hierarchy output</h2>
              <p>
                The UI stays empty until you send a request, then renders summary stats, user
                metadata, tree components, invalid entries, and duplicate edges from the backend
                response.
              </p>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}

export default App;
