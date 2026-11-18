import { h, render } from 'preact';
import './styles/app.css';
import './styles/triage-deck.css';
import { App } from './App';
import { initHubController } from './controller.js';

const root = document.getElementById('app');
if (root) {
  render(<App />, root);
  initHubController();
}

