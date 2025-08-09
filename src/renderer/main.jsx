// React and React DOM
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createHashRouter, RouterProvider } from 'react-router-dom';

// Styles
import './index.css';

// Local components and context
import App from './App';
import { ChatProvider } from './context/ChatContext';
import ProjectSelector from './pages/ProjectSelector';
import Settings from './pages/Settings';

const router = createHashRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/projects',
    element: <ProjectSelector />,
  },
  {
    path: '/settings',
    element: <Settings />,
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ChatProvider>
      <RouterProvider router={router} />
    </ChatProvider>
  </React.StrictMode>
); 