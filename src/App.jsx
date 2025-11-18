import { useEffect, useMemo, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'

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
            {user?.role === 'admin' && (
              <Link className={`px-3 py-1.5 rounded-full hover:bg-slate-800 ${location.pathname.startsWith('/admin/pending-courts') ? 'bg-slate-800' : ''}`} to="/admin/pending-courts">Pending courts</Link>
            )}
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

function CenterMap({ center, zoom }){
  const map = useMap()
  useEffect(()=>{ if(center) map.setView(center, zoom ?? map.getZoom()) }, [center, zoom])
  return null
}

function CourtsMap(){
  const { token } = useAuthContext()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState({ indoor_outdoor: '', min_courts: '', court_type: '', lighting: '' })
  const [courts, setCourts] = useState([])
  const [viewMode, setViewMode] = useState('map') // 'map' | 'list'
  const [userCenter, setUserCenter] = useState(null)
  const [hoveredId, setHoveredId] = useState(null)
  const listContainerRef = useRef(null)
  const itemRefs = useRef({})
  const headers = useMemo(()=> token ? { Authorization: `Bearer ${token}` } : {}, [token])

  useEffect(()=>{ fetch(`${API_URL}/courts?status=active&q=${encodeURIComponent(q)}&indoor_outdoor=${filters.indoor_outdoor}&min_courts=${filters.min_courts}&court_type=${filters.court_type}&lighting=${filters.lighting}`, { headers })
    .then(r=>r.json()).then(setCourts) }, [q, filters])

  // Request geolocation and set default center
  useEffect(() => {
    let didCancel = false
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          if (didCancel) return
          setUserCenter([pos.coords.latitude, pos.coords.longitude])
        },
        () => {
          if (didCancel) return
          setUserCenter([39.8283, -98.5795]) // USA centroid fallback
        },
        { enableHighAccuracy: true, timeout: 8000 }
      )
    } else {
      setUserCenter([39.8283, -98.5795])
    }
    return () => { didCancel = true }
  }, [])

  const onPinClick = (id) => {
    const el = itemRefs.current[id]
    if (el && listContainerRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      // also briefly accent the item
      el.classList.add('ring-2','ring-blue-500')
      setTimeout(()=>{
        el.classList.remove('ring-2','ring-blue-500')
      }, 900)
    }
  }

  const onItemHover = (id) => {
    setHoveredId(id)
    // clear after a brief moment to create a pulse
    setTimeout(() => { setHoveredId(h => h === id ? null : h) }, 1200)
  }

  const centerToUse = userCenter || [39.8283, -98.5795]
  const zoomToUse = userCenter ? 11 : 4

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
          <div className="ml-auto flex items-center gap-2 text-sm">
            <button onClick={()=>setViewMode('map')} className={`px-3 py-1.5 rounded ${viewMode==='map'?'bg-blue-600 text-white':'bg-slate-800'}`}>Map view</button>
            <button onClick={()=>setViewMode('list')} className={`px-3 py-1.5 rounded ${viewMode==='list'?'bg-blue-600 text-white':'bg-slate-800'}`}>List only</button>
            <button onClick={()=>nav('/courts/new')} className="px-3 py-1.5 rounded bg-emerald-600 text-white">Submit a new court</button>
          </div>
        </div>

        {viewMode === 'map' ? (
          <div className="h-[60vh] rounded-xl border border-slate-800 overflow-hidden">
            <MapContainer center={centerToUse} zoom={zoomToUse} className="h-full w-full" preferCanvas>
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <CenterMap center={centerToUse} zoom={zoomToUse} />
              {courts.filter(c=>c.latitude && c.longitude).map(c => (
                <CircleMarker
                  key={c._id}
                  center={[c.latitude, c.longitude]}
                  radius={hoveredId===c._id ? 10 : 6}
                  pathOptions={{ color: hoveredId===c._id ? '#60a5fa' : '#22d3ee', weight: hoveredId===c._id ? 4 : 2, fillColor: hoveredId===c._id ? '#60a5fa' : '#22d3ee', fillOpacity: 0.7 }}
                  eventHandlers={{ click: () => onPinClick(c._id) }}
                >
                  <Popup>
                    <div className="space-y-1">
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-xs opacity-80">{c.address_city}, {c.address_state}</div>
                      <button onClick={()=>onPinClick(c._id)} className="mt-1 text-xs px-2 py-1 rounded bg-blue-600 text-white">View in list</button>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        ) : (
          <div className="h-[60vh] rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
            List only mode is active.
          </div>
        )}
      </div>

      <div ref={listContainerRef} className="space-y-2 max-h-[70vh] overflow-auto">
        {courts.map(c => (
          <Link
            key={c._id}
            to={`/courts/${c._id}`}
            ref={el => { if (el) itemRefs.current[c._id] = el }}
            onMouseEnter={()=>onItemHover(c._id)}
            className={`block bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition ${hoveredId===c._id ? 'ring-1 ring-blue-500' : ''}`}
          >
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

function CourtCreate(){
  const { token } = useAuthContext()
  const nav = useNavigate()
  const [form, setForm] = useState({
    name:'',
    address_street:'', address_city:'', address_state:'', address_zip:'', address_country:'',
    latitude:'', longitude:'',
    number_of_courts:'', indoor_outdoor:'',
    hours:'', court_type:'', surface_type:'', lighting:'', busy_times:'',
    amenities:'', website_url:'', photos:''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true); setError('')
    try{
      const payload = {
        name: form.name,
        address_street: form.address_street,
        address_city: form.address_city,
        address_state: form.address_state,
        address_zip: form.address_zip,
        address_country: form.address_country || 'USA',
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        number_of_courts: Number(form.number_of_courts||0),
        indoor_outdoor: form.indoor_outdoor,
        hours: form.hours || null,
        court_type: form.court_type,
        surface_type: form.surface_type || null,
        lighting: form.lighting || 'no',
        busy_times: form.busy_times || null,
        amenities: form.amenities ? form.amenities.split(',').map(s=>s.trim()).filter(Boolean) : [],
        website_url: form.website_url || null,
        photos: form.photos ? form.photos.split(',').map(s=>s.trim()).filter(Boolean) : []
      }
      const res = await fetch(`${API_URL}/courts`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify(payload) })
      if(!res.ok) throw new Error('Failed to create court')
      alert('Thanks! Your court was submitted and is pending review.')
      nav('/map')
    }catch(err){ setError(err.message || 'Error') }
    finally{ setSaving(false) }
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-semibold mb-4">Submit a new court</h2>
      <form onSubmit={submit} className="bg-slate-900 border border-slate-800 rounded-xl p-4 grid md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <label className="text-sm">Name</label>
          <input value={form.name} onChange={e=>setForm(f=>({...f, name:e.target.value}))} className="w-full mt-1 px-3 py-2 rounded bg-slate-800 border border-slate-700" required />
        </div>
        <div>
          <label className="text-sm">Street</label>
          <input value={form.address_street} onChange={e=>setForm(f=>({...f, address_street:e.target.value}))} className="w-full mt-1 px-3 py-2 rounded bg-slate-800 border border-slate-700" required />
        </div>
        <div>
          <label className="text-sm">City</label>
          <input value={form.address_city} onChange={e=>setForm(f=>({...f, address_city:e.target.value}))} className="w-full mt-1 px-3 py-2 rounded bg-slate-800 border border-slate-700" required />
        </div>
        <div>
          <label className="text-sm">State</label>
          <input value={form.address_state} onChange={e=>setForm(f=>({...f, address_state:e.target.value}))} className="w-full mt-1 px-3 py-2 rounded bg-slate-800 border border-slate-700" required />
        </div>
        <div>
          <label className="text-sm">ZIP</label>
          <input value={form.address_zip} onChange={e=>setForm(f=>({...f, address_zip:e.target.value}))} className="w-full mt-1 px-3 py-2 rounded bg-slate-800 border border-slate-700" required />
        </div>
        <div>
          <label className="text-sm">Country</label>
          <input value={form.address_country} onChange={e=>setForm(f=>({...f, address_country:e.target.value}))} placeholder="USA" className="w-full mt-1 px-3 py-2 rounded bg-slate-800 border border-slate-700" />
        </div>
        <div>
          <label className="text-sm">Latitude</label>
          <input type="number" step="0.000001" value={form.latitude} onChange={e=>setForm(f=>({...f, latitude:e.target.value}))} className="w-full mt-1 px-3 py-2 rounded bg-slate-800 border border-slate-700" required />
        </div>
        <div>
          <label className="text-sm">Longitude</label>
          <input type="number" step="0.000001" value={form.longitude} onChange={e=>setForm(f=>({...f, longitude:e.target.value}))} className="w-full mt-1 px-3 py-2 rounded bg-slate-800 border border-slate-700" required />
        </div>
        <div>
          <label className="text-sm">Number of courts</label>
          <input type="number" min="0" value={form.number_of_courts} onChange={e=>setForm(f=>({...f, number_of_courts:e.target.value}))} className="w-full mt-1 px-3 py-2 rounded bg-slate-800 border border-slate-700" required />
        </div>
        <div>
          <label className="text-sm">Indoor/Outdoor</label>
          <select value={form.indoor_outdoor} onChange={e=>setForm(f=>({...f, indoor_outdoor:e.target.value}))} className="w-full mt-1 px-3 py-2 rounded bg-slate-800 border border-slate-700" required>
            <option value="">—</option>
            <option value="indoor">indoor</option>
            <option value="outdoor">outdoor</option>
          </select>
        </div>
        <div>
          <label className="text-sm">Court type</label>
          <select value={form.court_type} onChange={e=>setForm(f=>({...f, court_type:e.target.value}))} className="w-full mt-1 px-3 py-2 rounded bg-slate-800 border border-slate-700" required>
            <option value="">—</option>
            <option>public</option>
            <option>private club</option>
            <option>pay to play</option>
            <option>HOA</option>
            <option>other</option>
          </select>
        </div>
        <div>
          <label className="text-sm">Lighting</label>
          <select value={form.lighting} onChange={e=>setForm(f=>({...f, lighting:e.target.value}))} className="w-full mt-1 px-3 py-2 rounded bg-slate-800 border border-slate-700" required>
            <option value="">—</option>
            <option>yes</option>
            <option>no</option>
          </select>
        </div>
        <div>
          <label className="text-sm">Surface type</label>
          <input value={form.surface_type} onChange={e=>setForm(f=>({...f, surface_type:e.target.value}))} className="w-full mt-1 px-3 py-2 rounded bg-slate-800 border border-slate-700" />
        </div>
        <div>
          <label className="text-sm">Hours</label>
          <input value={form.hours} onChange={e=>setForm(f=>({...f, hours:e.target.value}))} placeholder="e.g., 7am - 10pm" className="w-full mt-1 px-3 py-2 rounded bg-slate-800 border border-slate-700" />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm">Busy times</label>
          <input value={form.busy_times} onChange={e=>setForm(f=>({...f, busy_times:e.target.value}))} placeholder="e.g., Weeknights 6-9pm" className="w-full mt-1 px-3 py-2 rounded bg-slate-800 border border-slate-700" />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm">Amenities (comma separated)</label>
          <input value={form.amenities} onChange={e=>setForm(f=>({...f, amenities:e.target.value}))} placeholder="restrooms, water, pro shop" className="w-full mt-1 px-3 py-2 rounded bg-slate-800 border border-slate-700" />
        </div>
        <div>
          <label className="text-sm">Website URL</label>
          <input value={form.website_url} onChange={e=>setForm(f=>({...f, website_url:e.target.value}))} placeholder="https://" className="w-full mt-1 px-3 py-2 rounded bg-slate-800 border border-slate-700" />
        </div>
        <div>
          <label className="text-sm">Photo URLs (comma separated)</label>
          <input value={form.photos} onChange={e=>setForm(f=>({...f, photos:e.target.value}))} placeholder="https://img1.jpg, https://img2.jpg" className="w-full mt-1 px-3 py-2 rounded bg-slate-800 border border-slate-700" />
        </div>
        {error && <div className="md:col-span-2 text-red-400 text-sm">{error}</div>}
        <div className="md:col-span-2 flex gap-2 justify-end">
          <button type="button" onClick={()=>nav(-1)} className="px-3 py-2 rounded bg-slate-700">Cancel</button>
          <button disabled={saving} className="px-3 py-2 rounded bg-emerald-600 text-white">{saving?'Submitting...':'Submit court'}</button>
        </div>
      </form>
      <p className="text-sm text-slate-400 mt-2">New submissions by regular users are set to pending review. Admins can approve or reject.</p>
    </div>
  )
}

function AdminPendingCourts(){
  const { token, user } = useAuthContext()
  const [items, setItems] = useState([])
  const load = () => fetch(`${API_URL}/courts?status=${encodeURIComponent('pending review')}`, { headers:{ Authorization:`Bearer ${token}` } }).then(r=>r.json()).then(setItems)
  useEffect(load, [])

  if(user?.role !== 'admin') return <div>Forbidden</div>

  const approve = async (id) => { await fetch(`${API_URL}/admin/courts/${id}/approve`, { method:'POST', headers:{ Authorization:`Bearer ${token}` } }); load() }
  const reject = async (id) => { await fetch(`${API_URL}/admin/courts/${id}/reject`, { method:'POST', headers:{ Authorization:`Bearer ${token}` } }); load() }

  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-semibold">Pending courts</h2>
      {items.length===0 && <div className="text-slate-400">No pending submissions.</div>}
      {items.map(c => (
        <div key={c._id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold">{c.name}</div>
              <div className="text-sm opacity-80">{c.address_city}, {c.address_state} • {c.indoor_outdoor} • {c.number_of_courts} courts</div>
              <div className="text-xs opacity-70 mt-1">Submitted by: {c.added_by_user_id || '—'}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={()=>approve(c._id)} className="px-3 py-1.5 rounded bg-emerald-600">Approve</button>
              <button onClick={()=>reject(c._id)} className="px-3 py-1.5 rounded bg-rose-600">Reject</button>
            </div>
          </div>
        </div>
      ))}
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
        <Route path="/courts/new" element={<AuthGate><Layout><CourtCreate /></Layout></AuthGate>} />
        <Route path="/courts/:id" element={<AuthGate><Layout><CourtDetail /></Layout></AuthGate>} />
        <Route path="/feed" element={<AuthGate><Layout><Feed /></Layout></AuthGate>} />
        <Route path="/events" element={<AuthGate><Layout><Events /></Layout></AuthGate>} />
        <Route path="/favorites" element={<AuthGate><Layout><Favorites /></Layout></AuthGate>} />
        <Route path="/admin/pending-courts" element={<AuthGate><Layout><AdminPendingCourts /></Layout></AuthGate>} />
        <Route path="/" element={<Layout><AuthPage /></Layout>} />
        <Route path="*" element={<Layout><AuthPage /></Layout>} />
      </Routes>
    </AuthProvider>
  )
}

export default Router
