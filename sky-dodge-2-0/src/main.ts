import './styles/app.css';
import { App } from './app/App';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Sky Dodge 2.0: missing #app root');

const app = new App(root);
void app.initialize();

window.addEventListener('pagehide', () => app.destroy(), { once: true });
