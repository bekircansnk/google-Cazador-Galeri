import { Navigate, Route, Routes } from 'react-router-dom'
import Album from './pages/Album'
import Home from './pages/Home'
import { DrawerProvider } from './state/drawerStore'
import RightActionDrawer from './components/RightActionDrawer'
import { ToastProvider } from './components/Toast'
import InstallPwaButton from './components/InstallPwaButton'

function App() {
  return (
    <DrawerProvider>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/album/:id" element={<Album />} />
          <Route path="/album" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
      <RightActionDrawer />
      <InstallPwaButton />
    </DrawerProvider>
  )
}

export default App
