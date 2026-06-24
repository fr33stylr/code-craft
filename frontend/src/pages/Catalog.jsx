import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom' // Imported the router hook

function Catalog() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Initialize the navigation hook
  const navigate = useNavigate()

  useEffect(() => {
    fetch("http://localhost:8000/api/projects")
      .then(response => {
        if (!response.ok) throw new Error("Failed to retrieve the quests from database.")
        return response.json()
      })
      .then(data => {
        setProjects(data)
        setLoading(false)
      })
      .catch(err => {
        console.error("Fetch error:", err)
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const getDifficultyBadge = (difficulty) => {
    const styles = {
      display: 'inline-block',
      padding: '0.25rem 0.75rem',
      borderRadius: '9999px',
      fontSize: '0.75rem',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    }

    if (difficulty === 'Beginner') return <span style={{ ...styles, backgroundColor: '#dcfce7', color: '#15803d' }}>Beginner</span>
    if (difficulty === 'Intermediate') return <span style={{ ...styles, backgroundColor: '#fef9c3', color: '#a16207' }}>Intermediate</span>
    return <span style={{ ...styles, backgroundColor: '#fee2e2', color: '#b91c1c' }}>Advanced</span>
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '3rem 1.5rem' }}>
      <header style={{ maxWidth: '1200px', margin: '0 auto 3rem auto', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', letterSpacing: '-0.025em', marginBottom: '0.5rem', background: 'linear-gradient(to right, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          CodeCraft Quests
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>
          Forge your programming skills by building real projects step-by-step.
        </p>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {loading && <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}><p>Loading available quests...</p></div>}

        {error && (
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #f87171', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
            <h3 style={{ color: '#f87171', marginTop: 0 }}>Quest Board Offline</h3>
            <p style={{ color: '#94a3b8', marginBottom: 0 }}>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', padding: '1rem 0' }}>
            {projects.map((project) => (
              <div 
                key={project.id} 
                style={{ backgroundColor: '#1e293b', borderRadius: '16px', padding: '2rem', border: '1px solid #334155', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', transition: 'transform 0.2s ease, border-color 0.2s ease', cursor: 'pointer' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#6366f1' }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#334155' }}
              >
                <div>
                  <div style={{ marginBottom: '1rem' }}>{getDifficultyBadge(project.difficulty)}</div>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: '700', marginBottom: '0.75rem', color: '#f8fafc' }}>{project.title}</h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>{project.description}</p>
                </div>

                <button style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: 'none', backgroundColor: '#4f46e5', color: '#ffffff', fontWeight: '600', fontSize: '0.95rem', cursor: 'pointer', transition: 'background-color 0.2s ease' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4338ca'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4f46e5'}
                  
                  // This is the magic router trigger!
                  onClick={() => navigate('/workspace',{state:{project:project}})}
                >
                  Start Quest
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default Catalog