import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { Layout } from './components/layout/Layout'
import Home from './pages/Home'
import Survey from './pages/Survey'
import Submit from './pages/Submit'
import Vision from './pages/Vision'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'

export default function App() {
  return (
    <BrowserRouter basename="/STAYLO">
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/survey" element={<Survey />} />
            <Route path="/submit" element={<Submit />} />
            <Route path="/vision" element={<Vision />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/join" element={<Register />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  )
}
