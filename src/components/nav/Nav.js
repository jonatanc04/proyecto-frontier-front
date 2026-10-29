import { NavLink } from 'react-router-dom';
import './Nav.css';

function Nav() {
  return (
    <nav className="nav-bar" aria-label="Navegacion principal">
      <div className="nav-bar__inner">
        <NavLink className="nav-bar__brand" to="/">
          Frontier Teams
        </NavLink>

        <div className="nav-bar__links">
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive ? 'nav-bar__link nav-bar__link--active' : 'nav-bar__link'
            }
          >
            Inicio
          </NavLink>
          <NavLink
            to="/players"
            className={({ isActive }) =>
              isActive ? 'nav-bar__link nav-bar__link--active' : 'nav-bar__link'
            }
          >
            Jugadores
          </NavLink>
          <NavLink
            to="/management"
            className={({ isActive }) =>
              isActive ? 'nav-bar__link nav-bar__link--active' : 'nav-bar__link'
            }
          >
            Gestión
          </NavLink>
        </div>
      </div>
    </nav>
  );
}

export default Nav;
