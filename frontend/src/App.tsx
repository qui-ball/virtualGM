import { RouterProvider } from 'react-router-dom';
import { router } from './routes';

/**
 * Main App component
 *
 * Sets up React Router with the application's route configuration.
 * All routing is handled through the router defined in `src/routes/index.tsx`.
 */
function App() {
  return <RouterProvider router={router} />;
}

export default App;
