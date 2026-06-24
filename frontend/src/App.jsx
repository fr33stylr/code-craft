import {BrowserRouter ,Routes, Route} from 'react-router-dom';
import Catalog from './pages/Catalog'
import Workspace from './components/Workspace';

function App(){
  return(
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Catalog />} />
        <Route path="/workspace" element={<Workspace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App;