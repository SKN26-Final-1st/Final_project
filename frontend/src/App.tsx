import { useState } from "react"
import { getPing } from "./api"

function App() {
  const [data, setData] = useState<any>(null)

  const handleClick = async () => {
    const result = await getPing()
    setData(result)
  }

  return (
    <div>
      <h1>React + Django 테스트</h1>

      <button onClick={handleClick}>
        API 호출
      </button>

      <pre>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}

export default App