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
