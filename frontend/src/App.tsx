import { useState } from "react"
import { login, logout } from "./api"
import "./App.css"

function App() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [data, setData] = useState<unknown>(null)

  const handleLogin = async () => {
    const result = await login(username, password)
    setData(result)
  }

  const handleLogout = async () => {
    const result = await logout()
    setData(result)
  }

  return (
    <main className="login-page">
      <h1>Login</h1>

      <div className="login-form">
        <label>
          Username
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        <div className="button-row">
          <button type="button" onClick={handleLogin}>
            Login
          </button>
          <button type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <section className="response-panel">
        <h2>Response</h2>
        <pre>{data === null ? "No response yet." : JSON.stringify(data, null, 2)}</pre>
      </section>
    </main>
  )
}

export default App
