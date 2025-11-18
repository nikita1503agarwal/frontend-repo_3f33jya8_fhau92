import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

function useAuth() {
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [user, setUser] = useState(null)

  useEffect(() => {
    if (!token) return
    fetch(`${API_URL}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(setUser)
      .catch(() => {})
  }, [token])

  const login = async (email, password) => {
    const body = new URLSearchParams({ username: email, password })
    const res = await fetch(`${API_URL}/auth/token`, { method: 'POST', body })
    if (!res.ok) throw new Error('Login failed')
    const data = await res.json()
    localStorage.setItem('token', data.access_token)
    setToken(data.access_token)
    return data
  }

  const signup = async (email, password, display_name) => {
    const body = new FormData()
    body.append('email', email)
    body.append('password', password)
    body.append('display_name', display_name)
    const res = await fetch(`${API_URL}/auth/signup`, { method: 'POST', body })
    if (!res.ok) throw new Error('Signup failed')
    const data = await res.json()
    localStorage.setItem('token', data.access_token)
    setToken(data.access_token)
    return data
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken('')
    setUser(null)
  }

  return { token, user, setUser, login, signup, logout }
}

function AuthGate({ children }) {
  const { token } = useAuthContext()
  const nav = useNavigate()
  useEffect(() => {
    if (!token) nav('/auth')
  }, [token])
  return children
}

const AuthContext = (props) => null

import React from 'react'
const AuthCtx = React.createContext(null)
function AuthProvider({ children }) {
  const auth = useAuth()
  return <AuthCtx.Provider value={auth}>{children}</AuthCtx.Provider>
}
function useAuthContext(){
  return React.useContext(AuthCtx)
}

function Layout({ children }){
  const { user, logout } = useAuthContext()
  const location = useLocation()
  const links = [
    { to: '/map', label: 'Courts Map' },
    { to: '/feed', label: 'Community Feed' },
    { to: '/events', label: 'Open Play & Events' },
    { to: '/favorites', label: 'My Favorites' },
    { to: '/profile', label: 'My Profile' },
  ]
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 backdrop-blur bg-slate-900/70 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link className="font-semibold" to="/map">Pickleball</Link>
          <nav className="flex gap-3 text-sm">
            {links.map(l => (
              <Link key={l.to} className={`px-3 py-1.5 rounded-full hover:bg-slate-800 ${location.pathname.startsWith(l.to) ? 'bg-slate-800' : ''}`} to={l.to}>{l.label}</Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {user ? (
              <>
                <span className="text-sm opacity-80">Hi, {user.display_name}</span>
                <button onClick={logout} className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm">Logout</button>
              </>
            ) : (
              <Link to="/auth" className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm">Sign in</Link>
            )}
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto w-full flex-1 px-4 py-6">{children}</main>
    </div>
  )
}

function AuthPage(){
  const { login, signup, token } = useAuthContext()
  const nav = useNavigate()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  useEffect(() => { if (token) nav('/map') }, [token])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try{
      if(mode==='login') await login(email, password)
      else await signup(email, password, displayName)
    }catch(err){ setError(err.message || 'Error') }
  }
  return (
    <div className="flex justify-center">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="text-xl font-semibold">{mode==='login'?'Sign in':'Create account'}</h2>
        {mode==='signup' && (
          <div>
            <label className="text-sm">Display name</label>
            <input value={displayName} onChange={e=>setDisplayName(e.target.value)} className="w-full mt-1 px-3 py-2 rounded bg-slate-800 border border-slate-700" required />
          </div>
        )}
        <div>
          <label className="text-sm">Email</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full mt-1 px-3 py-2 rounded bg-slate-800 border border-slate-700" required />
        </div>
        <div>
          <label className="text-sm">Password</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full mt-1 px-3 py-2 rounded bg-slate-800 border border-slate-700" required />
        </div>
        {error && <div className="text-red-400 text-sm">{error}</div>}
        <button className="w-full px-3 py-2 rounded bg-blue-600 hover:bg-blue-500">{mode==='login'?'Sign in':'Create account'}</button>
        <div className="text-sm text-center opacity-80">
          {mode==='login' ? (
            <button type="button" onClick={()=>setMode('signup')}>Need an account? Sign up</button>
          ) : (
            <button type="button" onClick={()=>setMode('login')}>Have an account? Sign in</button>
          )}
        </div>
      </form>
    </div>
  )
}

function CourtsMap(){
  const { token } = useAuthContext()
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState({ indoor_outdoor: '', min_courts: '', court_type: '', lighting: '' })
  const [courts, setCourts] = useState([])
  const headers = useMemo(()=> token ? { Authorization: `Bearer ${token}` } : {}, [token])

  useEffect(()=>{ fetch(`${API_URL}/courts?status=active&q=${encodeURIComponent(q)}&indoor_outdoor=${filters.indoor_outdoor}&min_courts=${filters.min_courts}&court_type=${filters.court_type}&lighting=${filters.lighting}`, { headers })
    .then(r=>r.json()).then(setCourts) }, [q, filters])

  return (
    <div className="grid md:grid-cols-[1fr_380px] gap-4">
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap items-center">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by name or city" className="flex-1 px-3 py-2 rounded bg-slate-900 border border-slate-800" />
          <select value={filters.indoor_outdoor} onChange={e=>setFilters(f=>({...f, indoor_outdoor: e.target.value}))} className="px-3 py-2 rounded bg-slate-900 border border-slate-800">
            <option value="">Indoor/Outdoor</option>
            <option value="indoor">Indoor</option>
            <option value="outdoor">Outdoor</option>
          </select>
          <input type="number" min="0" value={filters.min_courts} onChange={e=>setFilters(f=>({...f, min_courts: e.target.value}))} placeholder="# courts min" className="w-32 px-3 py-2 rounded bg-slate-900 border border-slate-800" />
          <select value={filters.court_type} onChange={e=>setFilters(f=>({...f, court_type: e.target.value}))} className="px-3 py-2 rounded bg-slate-900 border border-slate-800">
            <option value="">Type</option>
            <option>public</option>
            <option>private club</option>
            <option>pay to play</option>
            <option>HOA</option>
            <option>other</option>
          </select>
          <select value={filters.lighting} onChange={e=>setFilters(f=>({...f, lighting: e.target.value}))} className="px-3 py-2 rounded bg-slate-900 border border-slate-800">
            <option value="">Lights</option>
            <option>yes</option>
            <option>no</option>
          </select>
        </div>
        <div className="h-[60vh] rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
          Map placeholder — pins will appear here.
        </div>
      </div>
      <div className="space-y-2 max-h-[70vh] overflow-auto">
        {courts.map(c => (
          <Link key={c._id} to={`/courts/${c._id}`} className="block bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-slate-700">
            <div className="font-semibold">{c.name}</div>
            <div className="text-sm opacity-80">{c.address_city}, {c.address_state}</div>
            <div className="text-xs opacity-70 mt-1">{c.indoor_outdoor} • {c.number_of_courts} courts • {c.lighting==='yes'?'lights':'no lights'}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function CourtDetail(){
  const { token, user } = useAuthContext()
  const { pathname } = useLocation()
  const id = pathname.split('/').pop()
  const [court, setCourt] = useState(null)
  const [reviewText, setReviewText] = useState('')
  const [rating, setRating] = useState(5)

  useEffect(()=>{ fetch(`${API_URL}/courts/${id}`).then(r=>r.json()).then(setCourt) }, [id])

  const authHeaders = useMemo(()=> ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }), [token])

  const addReview = async () => {
    await fetch(`${API_URL}/courts/${id}/reviews`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ court_id: id, rating: Number(rating), text: reviewText }) })
    setReviewText('')
    const rs = await fetch(`${API_URL}/courts/${id}/reviews`).then(r=>r.json())
    setCourt(c => ({...c, reviews: rs }))
  }

  const favorite = async () => { await fetch(`${API_URL}/courts/${id}/favorite`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    alert('Favorited') }

  if(!court) return <div>Loading...</div>
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{court.name}</h1>
          <div className="opacity-80">{court.address_street}, {court.address_city}, {court.address_state}</div>
          <div className="text-sm opacity-80">{court.indoor_outdoor} • {court.number_of_courts} courts • {court.surface_type || '—'}</div>
          <div className="text-sm">Hours: {court.hours || '—'}</div>
          <div className="text-sm">Average rating: {court.average_rating ?? '—'} ({court.reviews_count} reviews)</div>
        </div>
        <button onClick={favorite} className="px-3 py-2 rounded bg-blue-600">Favorite</button>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        {(court.photos || []).slice(0,6).map((p,i)=> (
          <img key={i} src={p} alt="court" className="w-full h-40 object-cover rounded-lg border border-slate-800" />
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h3 className="font-semibold mb-2">Add a review</h3>
            <div className="flex gap-2 items-center">
              <input type="number" min="1" max="5" value={rating} onChange={e=>setRating(e.target.value)} className="w-20 px-2 py-1 rounded bg-slate-800 border border-slate-700" />
              <input value={reviewText} onChange={e=>setReviewText(e.target.value)} placeholder="Your thoughts" className="flex-1 px-3 py-2 rounded bg-slate-800 border border-slate-700" />
              <button onClick={addReview} className="px-3 py-2 rounded bg-blue-600">Post</button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h3 className="font-semibold mb-3">Reviews</h3>
            {(court.reviews || []).map(r => (
              <div key={r._id} className="border-b border-slate-800 py-2">
                <div className="text-sm">Rating: {r.rating}/5</div>
                <div className="text-sm opacity-80">{r.text}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h3 className="font-semibold mb-2">Players who frequent this court</h3>
            <div className="space-y-2">
              {(court.frequent_players || []).map(p => (
                <div key={p._id} className="text-sm flex items-center justify-between">
                  <span>{p.display_name}</span>
                  <span className="opacity-80">DUPR {p.dupr_score ?? '—'} • {p.skill_level || '—'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h3 className="font-semibold mb-2">Upcoming events</h3>
            <div className="space-y-2">
              {(court.upcoming_events || []).map(e => (
                <div key={e._id} className="text-sm">
                  <div className="font-medium">{e.title}</div>
                  <div className="opacity-80">{e.date} {e.start_time}-{e.end_time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Feed(){
  const { token } = useAuthContext()
  const [filter, setFilter] = useState('all')
  const [posts, setPosts] = useState([])
  const [text, setText] = useState('')

  const load = () => { fetch(`${API_URL}/feed?filter=${filter}`, { headers: { Authorization: `Bearer ${token}` } }).then(r=>r.json()).then(setPosts) }
  useEffect(load, [filter])

  const submit = async () => {
    await fetch(`${API_URL}/feed`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ text }) })
    setText(''); load()
  }

  return (
    <div className="grid md:grid-cols-[380px_1fr] gap-6">
      <div className="space-y-3">
        <select value={filter} onChange={e=>setFilter(e.target.value)} className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800">
          <option value="all">All</option>
          <option value="mycourts">My courts only</option>
          <option value="nearme">Near me</option>
        </select>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h3 className="font-semibold mb-2">Create post</h3>
          <textarea value={text} onChange={e=>setText(e.target.value)} rows={3} className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700" placeholder="Share something..." />
          <button onClick={submit} className="mt-2 px-3 py-2 rounded bg-blue-600">Post</button>
        </div>
      </div>
      <div className="space-y-3">
        {posts.map(p => (
          <div key={p._id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-sm opacity-80">{new Date(p.created_at).toLocaleString?.() || ''}</div>
            <div>{p.text}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Events(){
  const { token } = useAuthContext()
  const [events, setEvents] = useState([])
  const [form, setForm] = useState({ title:'', court_id:'', date:'', start_time:'', end_time:'', preferred_min:'', preferred_max:'', max_players:'' })

  const load = () => fetch(`${API_URL}/events`).then(r=>r.json()).then(setEvents)
  useEffect(load, [])

  const submit = async () => {
    const payload = { ...form, preferred_min: form.preferred_min? Number(form.preferred_min): null, preferred_max: form.preferred_max? Number(form.preferred_max): null, max_players: Number(form.max_players||0) }
    await fetch(`${API_URL}/events`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify(payload) })
    setForm({ title:'', court_id:'', date:'', start_time:'', end_time:'', preferred_min:'', preferred_max:'', max_players:'' })
    load()
  }

  return (
    <div className="grid md:grid-cols-[340px_1fr] gap-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
        <h3 className="font-semibold mb-2">Create event</h3>
        {['title','court_id','date','start_time','end_time','preferred_min','preferred_max','max_players'].map(k=> (
          <input key={k} placeholder={k} value={form[k]} onChange={e=>setForm(f=>({...f, [k]: e.target.value}))} className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700" />
        ))}
        <button onClick={submit} className="w-full px-3 py-2 rounded bg-blue-600">Create</button>
      </div>
      <div className="space-y-3">
        {events.map(e => (
          <div key={e._id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="font-semibold">{e.title}</div>
            <div className="text-sm opacity-80">{e.date} {e.start_time}-{e.end_time}</div>
            <div className="text-sm">Players: {(e.attendees||[]).length}/{e.max_players||'-'}</div>
            <div className="flex gap-2 mt-2">
              <button onClick={()=>fetch(`${API_URL}/events/${e._id}/join`, { method:'POST', headers:{ Authorization:`Bearer ${token}` }}).then(load)} className="px-3 py-1.5 rounded bg-green-600">Join</button>
              <button onClick={()=>fetch(`${API_URL}/events/${e._id}/leave`, { method:'POST', headers:{ Authorization:`Bearer ${token}` }}).then(load)} className="px-3 py-1.5 rounded bg-slate-700">Leave</button>
          </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Profile(){
  const { user, setUser, token } = useAuthContext()
  const [form, setForm] = useState({ display_name:'', home_city:'', home_court_id:'', dupr_score:'', dupr_profile_url:'', skill_level:'', play_style:'', bio:'', avatar_url:'' })
  useEffect(()=>{ if(user) setForm({ ...form, ...user }) }, [user])

  const save = async () => {
    const payload = { ...form, dupr_score: form.dupr_score? Number(form.dupr_score): null }
    const res = await fetch(`${API_URL}/me`, { method:'PUT', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify(payload) })
    const data = await res.json(); setUser(data)
  }

  return (
    <div className="max-w-2xl space-y-3">
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="text-sm">Display name</label>
          <input value={form.display_name||''} onChange={e=>setForm(f=>({...f, display_name: e.target.value}))} className="w-full mt-1 px-3 py-2 rounded bg-slate-900 border border-slate-800" />
        </div>
        <div>
          <label className="text-sm">Avatar URL</label>
          <input value={form.avatar_url||''} onChange={e=>setForm(f=>({...f, avatar_url: e.target.value}))} className="w-full mt-1 px-3 py-2 rounded bg-slate-900 border border-slate-800" />
        </div>
        <div>
          <label className="text-sm">Home city</label>
          <input value={form.home_city||''} onChange={e=>setForm(f=>({...f, home_city: e.target.value}))} className="w-full mt-1 px-3 py-2 rounded bg-slate-900 border border-slate-800" />
        </div>
        <div>
          <label className="text-sm">Home court ID</label>
          <input value={form.home_court_id||''} onChange={e=>setForm(f=>({...f, home_court_id: e.target.value}))} className="w-full mt-1 px-3 py-2 rounded bg-slate-900 border border-slate-800" />
        </div>
        <div>
          <label className="text-sm">DUPR score</label>
          <input type="number" step="0.1" value={form.dupr_score||''} onChange={e=>setForm(f=>({...f, dupr_score: e.target.value}))} className="w-full mt-1 px-3 py-2 rounded bg-slate-900 border border-slate-800" />
        </div>
        <div>
          <label className="text-sm">DUPR profile link</label>
          <input value={form.dupr_profile_url||''} onChange={e=>setForm(f=>({...f, dupr_profile_url: e.target.value}))} className="w-full mt-1 px-3 py-2 rounded bg-slate-900 border border-slate-800" />
        </div>
        <div>
          <label className="text-sm">Skill level</label>
          <select value={form.skill_level||''} onChange={e=>setForm(f=>({...f, skill_level: e.target.value}))} className="w-full mt-1 px-3 py-2 rounded bg-slate-900 border border-slate-800">
            <option value="">—</option>
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
            <option>Pro</option>
          </select>
        </div>
        <div>
          <label className="text-sm">Play style</label>
          <select value={form.play_style||''} onChange={e=>setForm(f=>({...f, play_style: e.target.value}))} className="w-full mt-1 px-3 py-2 rounded bg-slate-900 border border-slate-800">
            <option value="">—</option>
            <option>social</option>
            <option>competitive</option>
            <option>either</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-sm">Bio</label>
        <textarea value={form.bio||''} onChange={e=>setForm(f=>({...f, bio: e.target.value}))} rows={4} className="w-full mt-1 px-3 py-2 rounded bg-slate-900 border border-slate-800" />
      </div>
      <button onClick={save} className="px-3 py-2 rounded bg-blue-600">Save</button>
    </div>
  )
}

function Favorites(){
  const { token } = useAuthContext()
  const [items, setItems] = useState([])
  useEffect(()=>{ fetch(`${API_URL}/courts`, { headers: { Authorization:`Bearer ${token}` } }).then(r=>r.json()).then(setItems) }, [])
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map(c => (
        <Link key={c._id} to={`/courts/${c._id}`} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="font-semibold">{c.name}</div>
          <div className="text-sm opacity-80">{c.address_city}, {c.address_state}</div>
        </Link>
      ))}
    </div>
  )
}

function Router(){
  return (
    <AuthProvider>
      <Routes>
        <Route path="/auth" element={<Layout><AuthPage /></Layout>} />
        <Route path="/map" element={<AuthGate><Layout><CourtsMap /></Layout></AuthGate>} />
        <Route path="/courts/:id" element={<AuthGate><Layout><CourtDetail /></Layout></AuthGate>} />
        <Route path="/feed" element={<AuthGate><Layout><Feed /></Layout></AuthGate>} />
        <Route path="/events" element={<AuthGate><Layout><Events /></Layout></AuthGate>} />
        <Route path="/favorites" element={<AuthGate><Layout><Favorites /></Layout></AuthGate>} />
        <Route path="/profile" element={<AuthGate><Layout><Profile /></Layout></AuthGate>} />
        <Route path="*" element={<Layout><AuthPage /></Layout>} />
      </Routes>
    </AuthProvider>
  )
}

export default Router
