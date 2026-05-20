import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  Archive,
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock3,
  LayoutDashboard,
  ListFilter,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import './styles.css';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

const STATUSES = [
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
];

const PRIORITY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U';
}

function isOverdue(task) {
  if (!task.due_date || task.status === 'done') return false;
  return new Date(`${task.due_date}T23:59:59`) < new Date();
}

function relativeDate(value) {
  if (!value) return 'No date';
  const diff = Date.now() - new Date(value).getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return 'just now';
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  return `${Math.floor(diff / day)}d ago`;
}

function normalizeStatus(status) {
  if (status === 'inprogress') return 'in_progress';
  return status || 'todo';
}

function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function signIn(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) {
      setError(loginError.message);
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-brand">
        <div className="brand-mark">W</div>
        <p className="eyebrow">Apporio WorkBoard</p>
        <h1>Team execution, visible without noise.</h1>
        <p>
          A compact work board for CEOs, managers, and members to track ownership,
          movement, overdue work, and team activity.
        </p>
      </section>

      <form className="login-card" onSubmit={signIn}>
        <h2>Sign in</h2>
        <label>
          Email
          <input
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@apporio.com"
            type="email"
            required
          />
        </label>
        <label>
          Password
          <input
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Your password"
            type="password"
            required
          />
        </label>
        {error ? <div className="form-error">{error}</div> : null}
        <button className="primary-btn" disabled={loading} type="submit">
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}

function Sidebar({ activePage, currentUser, onPageChange, onSignOut, unreadCount }) {
  const nav = [
    { id: 'board', label: 'Board', icon: LayoutDashboard },
    { id: 'overview', label: 'Overview', icon: ListFilter },
    ...(currentUser?.role === 'ceo' || currentUser?.role === 'manager'
      ? [{ id: 'activity', label: 'Activity', icon: Activity }]
      : []),
    { id: 'people', label: currentUser?.role === 'member' ? 'Team' : 'People', icon: Users },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark small">W</div>
        <div>
          <strong>WorkBoard</strong>
          <span>Apporio OS</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              key={item.id}
              onClick={() => onPageChange(item.id)}
              type="button"
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-actions">
        <button className="icon-text-btn" type="button">
          <Bell size={17} />
          <span>Notifications</span>
          {unreadCount ? <b>{unreadCount}</b> : null}
        </button>
        <button className="icon-text-btn" type="button">
          <Settings size={17} />
          <span>Settings</span>
        </button>
      </div>

      <div className="sidebar-user">
        <div className="avatar">{initials(currentUser?.full_name || currentUser?.email)}</div>
        <div>
          <strong>{currentUser?.full_name || 'User'}</strong>
          <span>{currentUser?.role || 'member'}</span>
        </div>
        <button aria-label="Sign out" onClick={onSignOut} type="button">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}

function MobileTopbar({ activePage, onMenu, unreadCount }) {
  return (
    <header className="mobile-topbar">
      <button onClick={onMenu} type="button">
        <Menu size={20} />
      </button>
      <strong>{activePage === 'board' ? 'WorkBoard' : activePage}</strong>
      <button type="button">
        <Bell size={19} />
        {unreadCount ? <b>{unreadCount}</b> : null}
      </button>
    </header>
  );
}

function PageHeader({ title, subtitle, children }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="page-actions">{children}</div>
    </header>
  );
}

function BoardPage({ currentUser, profiles, tasks, onCreateTask, onOpenTask }) {
  const [personFilter, setPersonFilter] = useState('auto');
  const [query, setQuery] = useState('');

  const visibleProfiles = useMemo(() => {
    if (currentUser.role === 'member') return profiles.filter((p) => p.id === currentUser.id);
    if (personFilter === 'auto') {
      if (currentUser.role === 'manager') {
        return profiles.filter((p) => p.id === currentUser.id || p.manager_id === currentUser.id);
      }
      return profiles;
    }
    return profiles.filter((p) => p.id === personFilter);
  }, [currentUser, personFilter, profiles]);

  const filteredTasks = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tasks.filter((task) => !task.archived && (!needle || task.title?.toLowerCase().includes(needle)));
  }, [tasks, query]);

  const overdueCount = filteredTasks.filter(isOverdue).length;

  return (
    <section className="page">
      <PageHeader
        title={currentUser.role === 'member' ? 'My Board' : 'Team Board'}
        subtitle={`${visibleProfiles.length} people · ${filteredTasks.length} active tasks`}
      >
        <div className="search-box">
          <Search size={16} />
          <input placeholder="Search tasks" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {currentUser.role !== 'member' ? (
          <select value={personFilter} onChange={(event) => setPersonFilter(event.target.value)}>
            <option value="auto">{currentUser.role === 'manager' ? 'My team' : 'All people'}</option>
            {profiles.map((person) => (
              <option key={person.id} value={person.id}>
                {person.full_name || person.email}
              </option>
            ))}
          </select>
        ) : null}
        <button className="primary-btn compact" onClick={() => onCreateTask()} type="button">
          <Plus size={16} />
          Task
        </button>
      </PageHeader>

      <div className="board-alerts">
        <div className="metric-pill danger">
          <Clock3 size={15} />
          {overdueCount} overdue
        </div>
        <div className="metric-pill">
          <CheckCircle2 size={15} />
          {filteredTasks.filter((t) => t.status === 'done').length} done
        </div>
      </div>

      <div className="board-scroll">
        {visibleProfiles.map((person) => (
          <PersonLane
            key={person.id}
            onCreateTask={onCreateTask}
            onOpenTask={onOpenTask}
            person={person}
            tasks={filteredTasks.filter((task) => task.assignee_id === person.id)}
          />
        ))}
      </div>
    </section>
  );
}

function PersonLane({ person, tasks, onCreateTask, onOpenTask }) {
  const openTasks = tasks.filter((task) => normalizeStatus(task.status) !== 'done').length;
  return (
    <article className="person-lane">
      <div className="lane-header">
        <div className="avatar">{initials(person.full_name || person.email)}</div>
        <div>
          <h2>{person.full_name || person.email}</h2>
          <p>{person.role} · {openTasks} open · {tasks.length} total</p>
        </div>
      </div>
      <div className="columns">
        {STATUSES.map((status) => (
          <TaskColumn
            key={status.key}
            onCreateTask={() => onCreateTask({ assignee_id: person.id, status: status.key })}
            onOpenTask={onOpenTask}
            status={status}
            tasks={tasks
              .filter((task) => normalizeStatus(task.status) === status.key)
              .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))}
          />
        ))}
      </div>
    </article>
  );
}

function TaskColumn({ status, tasks, onCreateTask, onOpenTask }) {
  return (
    <section className="task-column">
      <header>
        <span>{status.label}</span>
        <b>{tasks.length}</b>
      </header>
      <div className="task-stack">
        {tasks.map((task) => (
          <TaskCard key={task.id} onClick={() => onOpenTask(task)} task={task} />
        ))}
      </div>
      <button className="add-card-btn" onClick={onCreateTask} type="button">
        <Plus size={15} />
        Add task
      </button>
    </section>
  );
}

function TaskCard({ task, onClick }) {
  const checklist = Array.isArray(task.checklist) ? task.checklist : [];
  const doneItems = checklist.filter((item) => item.done).length;
  const labels = Array.isArray(task.labels) ? task.labels.slice(0, 3) : [];
  return (
    <button className={`task-card priority-${task.priority || 'medium'}`} onClick={onClick} type="button">
      {labels.length ? (
        <div className="label-row">
          {labels.map((label) => (
            <span className={`label-dot label-${label}`} key={label} />
          ))}
        </div>
      ) : null}
      <strong>{task.title}</strong>
      {task.description ? <p>{task.description}</p> : null}
      <div className="card-meta">
        <span className={isOverdue(task) ? 'danger-text' : ''}>
          <CalendarClock size={14} />
          {task.due_date || 'No due'}
        </span>
        {checklist.length ? (
          <span>
            <CheckCircle2 size={14} />
            {doneItems}/{checklist.length}
          </span>
        ) : null}
      </div>
      <footer>
        <span className={`priority-badge ${task.priority || 'medium'}`}>
          {PRIORITY_LABELS[task.priority] || 'Medium'}
        </span>
        <span>{relativeDate(task.updated_at || task.created_at)}</span>
      </footer>
    </button>
  );
}

function OverviewPage({ tasks, profiles }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tasks
      .filter((task) => !task.archived)
      .filter((task) => status === 'all' || normalizeStatus(task.status) === status)
      .filter((task) => !needle || task.title?.toLowerCase().includes(needle))
      .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
  }, [query, status, tasks]);

  return (
    <section className="page">
      <PageHeader title="Overview" subtitle={`${rows.length} tasks matching current filters`}>
        <div className="search-box">
          <Search size={16} />
          <input placeholder="Search overview" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          {STATUSES.map((item) => (
            <option key={item.key} value={item.key}>{item.label}</option>
          ))}
        </select>
      </PageHeader>
      <div className="table-card">
        {rows.map((task) => {
          const assignee = profiles.find((profile) => profile.id === task.assignee_id);
          return (
            <div className="task-row" key={task.id}>
              <div>
                <strong>{task.title}</strong>
                <span>{assignee?.full_name || assignee?.email || 'Unassigned'}</span>
              </div>
              <span className={`status-pill ${normalizeStatus(task.status)}`}>{normalizeStatus(task.status).replace('_', ' ')}</span>
              <span className={isOverdue(task) ? 'danger-text' : ''}>{task.due_date || 'No due date'}</span>
              <span>{relativeDate(task.updated_at || task.created_at)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ActivityPage({ currentUser, activity, profiles, tasks }) {
  const visibleActivity = useMemo(() => {
    if (currentUser.role === 'ceo') return activity;
    const teamIds = new Set(profiles.filter((p) => p.id === currentUser.id || p.manager_id === currentUser.id).map((p) => p.id));
    return activity.filter((item) => teamIds.has(item.actor_id));
  }, [activity, currentUser, profiles]);

  return (
    <section className="page activity-page">
      <PageHeader title="Activity" subtitle="Track team movement and execution pulse" />
      <div className="activity-layout">
        <div className="activity-feed">
          {visibleActivity.slice(0, 80).map((item) => {
            const actor = profiles.find((profile) => profile.id === item.actor_id);
            const task = tasks.find((t) => t.id === item.task_id);
            return (
              <article className="activity-item" key={item.id}>
                <div className="avatar">{initials(actor?.full_name || actor?.email)}</div>
                <div>
                  <p>
                    <strong>{actor?.full_name || actor?.email || 'Someone'}</strong>
                    {' '}
                    {item.action?.replaceAll('_', ' ')}
                    {task ? <> on <b>{task.title}</b></> : null}
                  </p>
                  <span>{relativeDate(item.created_at)}</span>
                </div>
              </article>
            );
          })}
        </div>
        <aside className="insight-panel">
          <h3>Today</h3>
          <div className="insight-row">
            <span>Actions</span>
            <strong>{visibleActivity.filter((item) => new Date(item.created_at).toDateString() === new Date().toDateString()).length}</strong>
          </div>
          <div className="insight-row danger">
            <span>Overdue</span>
            <strong>{tasks.filter(isOverdue).length}</strong>
          </div>
          <div className="insight-row">
            <span>Completed</span>
            <strong>{tasks.filter((task) => task.status === 'done').length}</strong>
          </div>
        </aside>
      </div>
    </section>
  );
}

function PeoplePage({ profiles, currentUser }) {
  const visibleProfiles = currentUser.role === 'manager'
    ? profiles.filter((p) => p.id === currentUser.id || p.manager_id === currentUser.id)
    : profiles;

  return (
    <section className="page">
      <PageHeader title={currentUser.role === 'member' ? 'Team' : 'People'} subtitle={`${visibleProfiles.length} visible people`} />
      <div className="people-grid">
        {visibleProfiles.map((person) => (
          <article className="person-card" key={person.id}>
            <div className="avatar large">{initials(person.full_name || person.email)}</div>
            <strong>{person.full_name || person.email}</strong>
            <span>{person.email}</span>
            <b>{person.role}</b>
          </article>
        ))}
      </div>
    </section>
  );
}

function TaskPanel({ task, profiles, onClose }) {
  if (!task) return null;
  const assignee = profiles.find((profile) => profile.id === task.assignee_id);
  return (
    <div className="panel-backdrop" onClick={onClose}>
      <aside className="task-panel" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span className={`status-pill ${normalizeStatus(task.status)}`}>{normalizeStatus(task.status).replace('_', ' ')}</span>
            <h2>{task.title}</h2>
          </div>
          <button onClick={onClose} type="button">
            <X size={20} />
          </button>
        </header>
        <section>
          <h3>Details</h3>
          <div className="detail-grid">
            <span>Assignee</span><strong>{assignee?.full_name || assignee?.email || 'Unassigned'}</strong>
            <span>Priority</span><strong>{PRIORITY_LABELS[task.priority] || 'Medium'}</strong>
            <span>Due date</span><strong className={isOverdue(task) ? 'danger-text' : ''}>{task.due_date || 'No due date'}</strong>
            <span>Updated</span><strong>{relativeDate(task.updated_at || task.created_at)}</strong>
          </div>
        </section>
        <section>
          <h3>Description</h3>
          <p className="description">{task.description || 'No description yet.'}</p>
        </section>
      </aside>
    </div>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activity, setActivity] = useState([]);
  const [activePage, setActivePage] = useState('board');
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSession(data.session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setLoading(false);
      setCurrentUser(null);
      return;
    }

    let cancelled = false;
    async function loadData() {
      setLoading(true);
      const userId = session.user.id;
      const [profileResult, profilesResult, tasksResult, activityResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('profiles').select('*').order('full_name'),
        supabase.from('tasks').select('*').order('position', { ascending: true, nullsFirst: false }),
        supabase.from('activity').select('*').order('created_at', { ascending: false }).limit(200),
      ]);

      if (cancelled) return;
      if (profileResult.error) console.error(profileResult.error);
      if (profilesResult.error) console.error(profilesResult.error);
      if (tasksResult.error) console.error(tasksResult.error);
      if (activityResult.error) console.error(activityResult.error);

      setCurrentUser(profileResult.data);
      setProfiles(profilesResult.data || []);
      setTasks(tasksResult.data || []);
      setActivity(activityResult.data || []);
      setLoading(false);
    }

    loadData();
    const refresh = setInterval(loadData, 60000);
    return () => {
      cancelled = true;
      clearInterval(refresh);
    };
  }, [session]);

  async function signOut() {
    await supabase.auth.signOut();
  }

  function createTask(prefill = {}) {
    // Milestone 1 keeps creation explicit rather than half-baked.
    alert(`Task creation form comes next. Prefill: ${JSON.stringify(prefill)}`);
  }

  if (!session) return <LoginScreen />;
  if (loading || !currentUser) {
    return (
      <main className="loading-screen">
        <div className="brand-mark">W</div>
        <p>Loading WorkBoard...</p>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <MobileTopbar activePage={activePage} onMenu={() => setMobileMenu(true)} unreadCount={0} />
      <div className={`mobile-scrim ${mobileMenu ? 'show' : ''}`} onClick={() => setMobileMenu(false)} />
      <div className={`sidebar-wrap ${mobileMenu ? 'show' : ''}`}>
        <Sidebar
          activePage={activePage}
          currentUser={currentUser}
          onPageChange={(page) => {
            setActivePage(page);
            setMobileMenu(false);
          }}
          onSignOut={signOut}
          unreadCount={0}
        />
      </div>

      <main className="content-shell">
        {activePage === 'board' ? (
          <BoardPage
            currentUser={currentUser}
            onCreateTask={createTask}
            onOpenTask={setSelectedTask}
            profiles={profiles}
            tasks={tasks}
          />
        ) : null}
        {activePage === 'overview' ? <OverviewPage profiles={profiles} tasks={tasks} /> : null}
        {activePage === 'activity' ? (
          <ActivityPage activity={activity} currentUser={currentUser} profiles={profiles} tasks={tasks} />
        ) : null}
        {activePage === 'people' ? <PeoplePage currentUser={currentUser} profiles={profiles} /> : null}
      </main>

      <TaskPanel onClose={() => setSelectedTask(null)} profiles={profiles} task={selectedTask} />
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);

