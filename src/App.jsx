import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import PessoasApp from './Filmes'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <PessoasApp></PessoasApp>
      </div>
    </>
  )
}

export default App
